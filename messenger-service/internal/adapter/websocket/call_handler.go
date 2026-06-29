package wsadapter

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/google/uuid"
	messageDTO "github.com/tumlumtala/messenger-service/internal/application/dto/message"
	"github.com/tumlumtala/messenger-service/internal/domain/entity"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/notification"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/websocket"
)

const callRingTimeout = 45 * time.Second

type callInitiateRequest struct {
	ConversationID uint   `json:"conversation_id"`
	ReceiverID     uint   `json:"receiver_id"` // 0 for group calls
	CallType       string `json:"call_type"`
	IsGroup        bool   `json:"is_group"`
}

type callIDRequest struct {
	CallID string `json:"call_id"`
}

type groupCallStatusRequest struct {
	ConversationID uint `json:"conversation_id"`
}

type callMediaStateRequest struct {
	CallID   string `json:"call_id"`
	MicOn    bool   `json:"mic_on"`
	CameraOn bool   `json:"camera_on"`
}

// --------------------------------------------------------------------------
// 1-on-1 call initiate
// --------------------------------------------------------------------------

func (h *Handler) handleCallInitiate(client *websocket.Client, msg websocket.Message) {
	var req callInitiateRequest
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		h.sendError(client, "Invalid call payload")
		return
	}
	if req.ConversationID == 0 || (req.CallType != "audio" && req.CallType != "video") {
		h.sendError(client, "Invalid call payload")
		return
	}

	if req.IsGroup {
		h.handleGroupCallInitiate(client, req)
		return
	}

	// 1-on-1 call
	if req.ReceiverID == 0 || req.ReceiverID == client.UserID() {
		h.sendError(client, "Invalid call payload")
		return
	}
	if !h.canCallParticipant(req.ConversationID, client.UserID(), req.ReceiverID) {
		h.sendError(client, "Cannot start call in this conversation")
		return
	}

	if _, busy := h.activeCallsByUser.Load(req.ReceiverID); busy {
		call := h.newCall(req, client.UserID(), "busy")
		_ = h.callRepo.Create(context.Background(), call)
		h.sendCallEvent(client, "call:busy", call, nil)
		return
	}
	if _, busy := h.activeCallsByUser.Load(client.UserID()); busy {
		call := h.newCall(req, client.UserID(), "busy")
		_ = h.callRepo.Create(context.Background(), call)
		h.sendCallEvent(client, "call:busy", call, nil)
		return
	}

	call := h.newCall(req, client.UserID(), "ringing")
	if err := h.callRepo.Create(context.Background(), call); err != nil {
		h.sendError(client, "Cannot create call")
		return
	}

	h.activeCallsByUser.Store(client.UserID(), call.ID)
	h.activeCallsByUser.Store(req.ReceiverID, call.ID)
	h.sendCallEvent(client, "call:ringing", call, nil)
	h.broadcastCallEvent(req.ReceiverID, "call:incoming", call, nil)
	go h.notifyIncomingCall(call)
	go h.expireRingingCall(call.ID)
}

// --------------------------------------------------------------------------
// Group call initiate & join
// --------------------------------------------------------------------------

func (h *Handler) handleGroupCallInitiate(client *websocket.Client, req callInitiateRequest) {
	ctx := context.Background()

	// Check if there's already an active group call in this conversation
	existing, err := h.callRepo.GetActiveGroupCall(ctx, req.ConversationID)
	if err != nil {
		h.sendError(client, "Cannot check call status")
		return
	}

	if existing != nil {
		// There's already an active call – join it instead
		h.joinGroupCall(client, existing)
		return
	}

	// Get all participants of the conversation
	participants, err := h.conversationRepo.GetParticipants(ctx, req.ConversationID)
	if err != nil || len(participants) < 2 {
		h.sendError(client, "Cannot start call in this conversation")
		return
	}

	// Verify caller is a participant
	callerInConv := false
	for _, p := range participants {
		if p.ID == client.UserID() {
			callerInConv = true
			break
		}
	}
	if !callerInConv {
		h.sendError(client, "Cannot start call in this conversation")
		return
	}

	// Check if caller is already in another call
	if _, busy := h.activeCallsByUser.Load(client.UserID()); busy {
		h.sendError(client, "Bạn đang trong một cuộc gọi khác")
		return
	}

	call := h.newGroupCall(req, client.UserID())
	if err := h.callRepo.Create(ctx, call); err != nil {
		h.sendError(client, "Cannot create call")
		return
	}

	// Add caller as first joined participant
	now := time.Now()
	_ = h.callRepo.AddParticipant(ctx, &entity.CallParticipant{
		CallID:   call.ID,
		UserID:   client.UserID(),
		Status:   "joined",
		JoinedAt: &now,
	})
	h.activeCallsByUser.Store(client.UserID(), call.ID)

	// Notify all other participants about the incoming group call
	for _, p := range participants {
		if p.ID == client.UserID() {
			continue
		}
		_ = h.callRepo.AddParticipant(ctx, &entity.CallParticipant{
			CallID: call.ID,
			UserID: p.ID,
			Status: "invited",
		})
		h.broadcastGroupCallEvent(p.ID, "call:group-incoming", call, h.buildGroupParticipantInfo(ctx, call.ID, participants))
	}

	participantInfo := h.buildGroupParticipantInfo(ctx, call.ID, participants)

	// Tell caller the call is ringing (waiting for others to join).
	// The call transitions to "started/connected" when the first other participant joins.
	h.sendGroupCallEvent(client, "call:group-ringing", call, participantInfo)

	go h.notifyGroupIncomingCall(call, participants)
	go h.expireGroupCall(call.ID)
}

func (h *Handler) joinGroupCall(client *websocket.Client, call *entity.CallSession) {
	ctx := context.Background()
	if call.Status != "ringing" && call.Status != "accepted" {
		h.sendError(client, "Cuộc gọi đã kết thúc")
		return
	}

	// Check if user is already busy in another call
	if existingID, busy := h.activeCallsByUser.Load(client.UserID()); busy {
		if existingID != call.ID {
			h.sendError(client, "Bạn đang trong một cuộc gọi khác")
			return
		}
		// The same user can reconnect after reloading the page. Re-announce the
		// participant so every remaining client replaces its stale WebRTC peer.
		participants, _ := h.conversationRepo.GetParticipants(ctx, call.ConversationID)
		info := h.buildGroupParticipantInfo(ctx, call.ID, participants)
		h.sendGroupCallEvent(client, "call:group-joined", call, info)
		h.broadcastToGroupCallParticipants(ctx, call.ID, client.UserID(), "call:group-participant-joined", call, info)
		return
	}

	// Check capacity
	activeCount, _ := h.callRepo.CountActiveParticipants(ctx, call.ID)
	if activeCount >= entity.GroupCallMaxParticipants {
		msg, _ := websocket.NewMessage("call:group-full", map[string]any{
			"call_id":         call.ID,
			"conversation_id": call.ConversationID,
			"max":             entity.GroupCallMaxParticipants,
			"message":         fmt.Sprintf("Phòng đã đầy, tối đa %d người", entity.GroupCallMaxParticipants),
		})
		client.Send(msg)
		return
	}

	// Update participant status to joined
	now := time.Now()
	_ = h.callRepo.UpdateParticipantStatus(ctx, call.ID, client.UserID(), "joined")
	_ = h.callRepo.AddParticipant(ctx, &entity.CallParticipant{
		CallID:   call.ID,
		UserID:   client.UserID(),
		Status:   "joined",
		JoinedAt: &now,
	})
	h.activeCallsByUser.Store(client.UserID(), call.ID)

	// If this is the first joiner (call still ringing), mark as accepted and notify caller.
	wasRinging := call.Status == "ringing"
	if wasRinging {
		started, err := h.callRepo.Start(ctx, call.ID)
		if err != nil || started == nil {
			h.sendError(client, "Cannot start group call")
			return
		}
		call = started
	}

	convParticipants, _ := h.conversationRepo.GetParticipants(ctx, call.ConversationID)
	info := h.buildGroupParticipantInfo(ctx, call.ID, convParticipants)

	// Tell the joining user about everyone
	h.sendGroupCallEvent(client, "call:group-joined", call, info)

	// Tell everyone else (including the caller waiting) that this user joined.
	// When wasRinging, the caller receives call:group-started to transition from
	// "calling" to "connected". Subsequent joins get call:group-participant-joined.
	if wasRinging {
		h.broadcastGroupParticipantEvent(call.CallerID, "call:group-started", call, info, client.UserID())
	} else {
		h.broadcastToGroupCallParticipants(ctx, call.ID, client.UserID(), "call:group-participant-joined", call, info)
	}
	h.broadcastGroupCallObservers(ctx, call, info, client.UserID())
}

// handleGroupCallJoin handles explicit join request from a client
func (h *Handler) handleGroupCallJoin(client *websocket.Client, msg websocket.Message) {
	call := h.callFromMessage(client, msg)
	if call == nil {
		return
	}
	if !call.IsGroup {
		h.sendError(client, "Not a group call")
		return
	}
	h.joinGroupCall(client, call)
}

// handleGroupCallStatus lets a conversation detail discover an already-running call.
func (h *Handler) handleGroupCallStatus(client *websocket.Client, msg websocket.Message) {
	var req groupCallStatusRequest
	if err := json.Unmarshal(msg.Payload, &req); err != nil || req.ConversationID == 0 {
		h.sendError(client, "Invalid call payload")
		return
	}
	ctx := context.Background()
	ok, _ := h.conversationRepo.IsParticipant(ctx, req.ConversationID, client.UserID())
	if !ok {
		h.sendError(client, "Unauthorized call")
		return
	}
	call, err := h.callRepo.GetActiveGroupCall(ctx, req.ConversationID)
	if err != nil || call == nil || call.Status != "accepted" {
		msg, _ := websocket.NewMessage("call:group-unavailable", map[string]any{
			"conversation_id": req.ConversationID,
		})
		client.Send(msg)
		return
	}
	participants, _ := h.conversationRepo.GetParticipants(ctx, call.ConversationID)
	h.sendGroupCallEvent(client, "call:group-ongoing", call, h.buildGroupParticipantInfo(ctx, call.ID, participants))
}

// handleGroupCallHeartbeat is sent only by a client that already has the call
// screen and local media active. It repairs a dropped initial join event and
// returns authoritative participant state to the client.
func (h *Handler) handleGroupCallHeartbeat(client *websocket.Client, msg websocket.Message) {
	call := h.callFromMessage(client, msg)
	if call == nil {
		return
	}
	if !call.IsGroup || (call.Status != "ringing" && call.Status != "accepted") {
		return
	}

	ctx := context.Background()
	callParticipants, err := h.callRepo.GetParticipants(ctx, call.ID)
	if err != nil {
		h.sendError(client, "Cannot get call participants")
		return
	}
	for _, participant := range callParticipants {
		if participant.UserID == client.UserID() && participant.Status == "joined" {
			h.activeCallsByUser.Store(client.UserID(), call.ID)
			participants, _ := h.conversationRepo.GetParticipants(ctx, call.ConversationID)
			h.sendGroupCallEvent(client, "call:group-state", call, h.buildGroupParticipantInfo(ctx, call.ID, participants))
			return
		}
	}

	// The UI is active but the original join was lost or the participant had
	// previously been marked left. Let the normal join path update and broadcast.
	h.activeCallsByUser.Delete(client.UserID())
	h.joinGroupCall(client, call)
}

// handleGroupCallDecline dismisses the initial ringing UI without ending the room.
func (h *Handler) handleGroupCallDecline(client *websocket.Client, msg websocket.Message) {
	call := h.callFromMessage(client, msg)
	if call == nil {
		return
	}
	if !call.IsGroup {
		h.sendError(client, "Not a group call")
		return
	}
	_ = h.callRepo.UpdateParticipantStatus(context.Background(), call.ID, client.UserID(), "declined")
	h.sendGroupCallEvent(client, "call:group-declined", call, nil)
}

// handleGroupCallLeave handles a participant leaving (not ending) the group call
func (h *Handler) handleGroupCallLeave(client *websocket.Client, msg websocket.Message) {
	call := h.callFromMessage(client, msg)
	if call == nil {
		return
	}
	if !call.IsGroup {
		h.sendError(client, "Not a group call")
		return
	}
	ctx := context.Background()
	_ = h.callRepo.UpdateParticipantStatus(ctx, call.ID, client.UserID(), "left")
	h.activeCallsByUser.Delete(client.UserID())

	// Notify remaining participants
	convParticipants, _ := h.conversationRepo.GetParticipants(ctx, call.ConversationID)
	info := h.buildGroupParticipantInfo(ctx, call.ID, convParticipants)
	h.broadcastToGroupCallParticipants(ctx, call.ID, client.UserID(), "call:group-participant-left", call, info)
	h.broadcastGroupCallObservers(ctx, call, info, client.UserID())

	// Send confirmation to the leaving user
	h.sendGroupCallEvent(client, "call:group-left", call, info)

	// If no one is left, end the call
	activeCount, _ := h.callRepo.CountActiveParticipants(ctx, call.ID)
	if activeCount == 0 {
		updated, _ := h.callRepo.End(ctx, call.ID, "ended")
		if updated != nil {
			participants, _ := h.callRepo.GetParticipants(ctx, call.ID)
			for _, p := range participants {
				h.broadcastGroupCallEvent(p.UserID, "call:end", updated, nil)
			}
			go h.createCallActivity(updated)
		}
	}
}

// handleCallMediaState relays microphone/camera state so every tile can show
// an explicit status instead of inferring it from a silent or black stream.
func (h *Handler) handleCallMediaState(client *websocket.Client, msg websocket.Message) {
	call := h.callFromMessage(client, msg)
	if call == nil {
		return
	}

	var req callMediaStateRequest
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		h.sendError(client, "Invalid media state payload")
		return
	}

	payload := map[string]any{
		"call_id":             call.ID,
		"participant_user_id": client.UserID(),
		"sender_id":           client.UserID(),
		"mic_on":              req.MicOn,
		"camera_on":           req.CameraOn,
	}
	event, err := websocket.NewMessage("call:media-state", payload)
	if err != nil {
		return
	}

	if !call.IsGroup {
		h.hub.BroadcastRoom(userChannel(otherCallUser(call, client.UserID())), event)
		return
	}

	participants, err := h.callRepo.GetParticipants(context.Background(), call.ID)
	if err != nil {
		return
	}
	senderJoined := false
	for _, participant := range participants {
		if participant.UserID == client.UserID() && participant.Status == "joined" {
			senderJoined = true
			break
		}
	}
	if !senderJoined {
		h.sendError(client, "Unauthorized media state")
		return
	}
	for _, participant := range participants {
		if participant.UserID != client.UserID() && participant.Status == "joined" {
			h.hub.BroadcastRoom(userChannel(participant.UserID), event)
		}
	}
}

// --------------------------------------------------------------------------
// 1-on-1 accept / terminal / relay (backward compatible)
// --------------------------------------------------------------------------

func (h *Handler) handleCallAccept(client *websocket.Client, msg websocket.Message) {
	call := h.callFromMessage(client, msg)
	if call == nil {
		return
	}

	if call.IsGroup {
		h.joinGroupCall(client, call)
		return
	}

	if client.UserID() != call.ReceiverID {
		h.sendError(client, "Only receiver can accept call")
		return
	}
	updated, err := h.callRepo.Start(context.Background(), call.ID)
	if err != nil || updated == nil {
		h.sendError(client, "Cannot accept call")
		return
	}
	h.sendCallEvent(client, "call:accept", updated, nil)
	h.broadcastCallEvent(otherCallUser(updated, client.UserID()), "call:accept", updated, nil)
}

func (h *Handler) handleCallTerminal(client *websocket.Client, msg websocket.Message, status string, eventType string) {
	call := h.callFromMessage(client, msg)
	if call == nil {
		return
	}

	if call.IsGroup {
		// For group calls, "end" from the caller ends the whole call;
		// individual participants use call:group-leave instead.
		if client.UserID() != call.CallerID {
			h.sendError(client, "Only the call creator can end a group call")
			return
		}
		ctx := context.Background()
		updated, err := h.callRepo.End(ctx, call.ID, status)
		if err != nil || updated == nil {
			h.sendError(client, "Cannot update call")
			return
		}
		h.clearGroupActiveCall(ctx, call.ID)
		// Broadcast to all participants
		participants, _ := h.callRepo.GetParticipants(ctx, call.ID)
		for _, p := range participants {
			h.broadcastGroupCallEvent(p.UserID, eventType, updated, nil)
		}
		go h.createCallActivity(updated)
		return
	}

	updated, err := h.callRepo.End(context.Background(), call.ID, status)
	if err != nil || updated == nil {
		h.sendError(client, "Cannot update call")
		return
	}
	h.clearActiveCall(updated)
	h.sendCallEvent(client, eventType, updated, nil)
	h.broadcastCallEvent(otherCallUser(updated, client.UserID()), eventType, updated, nil)
	go h.createCallActivity(updated)
}

// handleCallRelay relays WebRTC signaling (offer/answer/ICE) between participants.
// For group calls the payload must include a target_user_id to route correctly.
func (h *Handler) handleCallRelay(client *websocket.Client, msg websocket.Message) {
	call := h.callFromMessage(client, msg)
	if call == nil {
		return
	}
	var payload map[string]any
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		h.sendError(client, "Invalid call payload")
		return
	}
	payload["sender_id"] = client.UserID()
	payload["conversation_id"] = call.ConversationID
	payload["call_type"] = call.CallType

	relay, err := websocket.NewMessage(msg.Type, payload)
	if err != nil {
		h.sendError(client, "Invalid call payload")
		return
	}
	relay.Sender = strconv.FormatUint(uint64(client.UserID()), 10)

	if call.IsGroup {
		// Route to specific target user for mesh WebRTC
		targetID, _ := payload["target_user_id"].(float64)
		if targetID == 0 {
			h.sendError(client, "target_user_id required for group call relay")
			return
		}
		h.hub.BroadcastRoom(userChannel(uint(targetID)), relay)
		return
	}

	h.hub.BroadcastRoom(userChannel(otherCallUser(call, client.UserID())), relay)
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

func (h *Handler) callFromMessage(client *websocket.Client, msg websocket.Message) *entity.CallSession {
	var req callIDRequest
	if err := json.Unmarshal(msg.Payload, &req); err != nil || req.CallID == "" {
		h.sendError(client, "Invalid call payload")
		return nil
	}
	call, err := h.callRepo.Get(context.Background(), req.CallID)
	if err != nil || call == nil {
		h.sendError(client, "Call not found")
		return nil
	}
	// For group calls, anyone in the conversation can be authorized; for 1-on-1 restrict to two parties.
	if !call.IsGroup && client.UserID() != call.CallerID && client.UserID() != call.ReceiverID {
		h.sendError(client, "Unauthorized call")
		return nil
	}
	if call.IsGroup {
		ok, _ := h.conversationRepo.IsParticipant(context.Background(), call.ConversationID, client.UserID())
		if !ok {
			h.sendError(client, "Unauthorized call")
			return nil
		}
	}
	return call
}

func (h *Handler) canCallParticipant(conversationID, callerID, receiverID uint) bool {
	participants, err := h.conversationRepo.GetParticipants(context.Background(), conversationID)
	if err != nil || len(participants) != 2 {
		return false
	}
	foundCaller := false
	foundReceiver := false
	for _, p := range participants {
		if p.ID == callerID {
			foundCaller = true
		}
		if p.ID == receiverID {
			foundReceiver = true
		}
	}
	return foundCaller && foundReceiver
}

func (h *Handler) newCall(req callInitiateRequest, callerID uint, status string) *entity.CallSession {
	now := time.Now()
	return &entity.CallSession{
		ID:              uuid.NewString(),
		ConversationID:  req.ConversationID,
		CallerID:        callerID,
		ReceiverID:      req.ReceiverID,
		CallType:        req.CallType,
		Status:          status,
		IsGroup:         false,
		MaxParticipants: 2,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
}

func (h *Handler) newGroupCall(req callInitiateRequest, callerID uint) *entity.CallSession {
	now := time.Now()
	return &entity.CallSession{
		ID:              uuid.NewString(),
		ConversationID:  req.ConversationID,
		CallerID:        callerID,
		ReceiverID:      0,
		CallType:        req.CallType,
		Status:          "ringing",
		IsGroup:         true,
		MaxParticipants: entity.GroupCallMaxParticipants,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
}

type groupParticipantInfo struct {
	UserID   uint   `json:"user_id"`
	FullName string `json:"fullname"`
	Avatar   string `json:"avatar"`
	Status   string `json:"status"`
}

func (h *Handler) buildGroupParticipantInfo(ctx context.Context, callID string, convParticipants []entity.ParticipantInfo) []groupParticipantInfo {
	callParts, _ := h.callRepo.GetParticipants(ctx, callID)
	statusMap := make(map[uint]string, len(callParts))
	for _, p := range callParts {
		statusMap[p.UserID] = p.Status
	}

	out := make([]groupParticipantInfo, 0, len(convParticipants))
	for _, p := range convParticipants {
		status := statusMap[p.ID]
		if status == "" {
			status = "invited"
		}
		out = append(out, groupParticipantInfo{
			UserID:   p.ID,
			FullName: p.FullName,
			Avatar:   p.Avatar,
			Status:   status,
		})
	}
	return out
}

func (h *Handler) sendCallEvent(client *websocket.Client, eventType string, call *entity.CallSession, extra map[string]any) {
	payload := h.callEventPayload(call)
	for k, v := range extra {
		payload[k] = v
	}
	msg, err := websocket.NewMessage(eventType, payload)
	if err != nil {
		return
	}
	client.Send(msg)
}

func (h *Handler) broadcastCallEvent(userID uint, eventType string, call *entity.CallSession, extra map[string]any) {
	payload := h.callEventPayload(call)
	for k, v := range extra {
		payload[k] = v
	}
	msg, err := websocket.NewMessage(eventType, payload)
	if err != nil {
		return
	}
	h.hub.BroadcastRoom(userChannel(userID), msg)
}

func (h *Handler) sendGroupCallEvent(client *websocket.Client, eventType string, call *entity.CallSession, participants interface{}) {
	payload := h.groupCallEventPayload(call, participants)
	msg, err := websocket.NewMessage(eventType, payload)
	if err != nil {
		return
	}
	client.Send(msg)
}

func (h *Handler) broadcastGroupCallEvent(userID uint, eventType string, call *entity.CallSession, participants interface{}) {
	payload := h.groupCallEventPayload(call, participants)
	msg, err := websocket.NewMessage(eventType, payload)
	if err != nil {
		return
	}
	h.hub.BroadcastRoom(userChannel(userID), msg)
}

func (h *Handler) broadcastToGroupCallParticipants(ctx context.Context, callID string, excludeUserID uint, eventType string, call *entity.CallSession, participants interface{}) {
	parts, err := h.callRepo.GetParticipants(ctx, callID)
	if err != nil {
		return
	}
	for _, p := range parts {
		if p.UserID == excludeUserID || p.Status != "joined" {
			continue
		}
		h.broadcastGroupParticipantEvent(p.UserID, eventType, call, participants, excludeUserID)
	}
}

func (h *Handler) broadcastGroupParticipantEvent(userID uint, eventType string, call *entity.CallSession, participants interface{}, participantUserID uint) {
	payload := h.groupCallEventPayload(call, participants)
	payload["participant_user_id"] = participantUserID
	msg, err := websocket.NewMessage(eventType, payload)
	if err != nil {
		return
	}
	h.hub.BroadcastRoom(userChannel(userID), msg)
}

func (h *Handler) broadcastGroupCallObservers(ctx context.Context, call *entity.CallSession, participants interface{}, excludeUserID uint) {
	parts, err := h.callRepo.GetParticipants(ctx, call.ID)
	if err != nil {
		return
	}
	for _, p := range parts {
		if p.UserID == excludeUserID || p.Status == "joined" {
			continue
		}
		h.broadcastGroupCallEvent(p.UserID, "call:group-ongoing", call, participants)
	}
}

func (h *Handler) clearGroupActiveCall(ctx context.Context, callID string) {
	parts, _ := h.callRepo.GetParticipants(ctx, callID)
	for _, p := range parts {
		h.activeCallsByUser.Delete(p.UserID)
	}
}

func (h *Handler) notifyIncomingCall(call *entity.CallSession) {
	if h.callNotifier == nil || call == nil {
		return
	}
	event := notification.IncomingCallEvent{
		CallID:         call.ID,
		ConversationID: call.ConversationID,
		CallerID:       call.CallerID,
		ReceiverID:     call.ReceiverID,
		CallType:       call.CallType,
		ExpiresAt:      call.CreatedAt.Add(callRingTimeout),
	}
	participants, err := h.conversationRepo.GetParticipants(context.Background(), call.ConversationID)
	if err == nil {
		for _, participant := range participants {
			if participant.ID == call.CallerID {
				event.CallerName = participant.FullName
			}
			if participant.ID == call.ReceiverID {
				event.ReceiverEmail = participant.Email
			}
		}
	}
	if err := h.callNotifier.NotifyIncomingCall(context.Background(), event); err != nil {
		fmt.Printf("[notification] incoming call notify failed: %v\n", err)
	}
}

func (h *Handler) notifyGroupIncomingCall(call *entity.CallSession, _ []entity.ParticipantInfo) {
	// Group call notifications – broadcast to conversation channel
	if h.callNotifier == nil || call == nil {
		return
	}
	convParticipants, err := h.conversationRepo.GetParticipants(context.Background(), call.ConversationID)
	if err != nil {
		return
	}
	callerName := ""
	for _, p := range convParticipants {
		if p.ID == call.CallerID {
			callerName = p.FullName
			break
		}
	}
	for _, p := range convParticipants {
		if p.ID == call.CallerID {
			continue
		}
		event := notification.IncomingCallEvent{
			CallID:         call.ID,
			ConversationID: call.ConversationID,
			CallerID:       call.CallerID,
			ReceiverID:     p.ID,
			CallType:       call.CallType,
			CallerName:     callerName,
			ReceiverEmail:  p.Email,
			ExpiresAt:      call.CreatedAt.Add(callRingTimeout),
		}
		if err := h.callNotifier.NotifyIncomingCall(context.Background(), event); err != nil {
			fmt.Printf("[notification] group incoming call notify failed: %v\n", err)
		}
	}
}

func (h *Handler) expireRingingCall(callID string) {
	time.Sleep(callRingTimeout)
	call, err := h.callRepo.Get(context.Background(), callID)
	if err != nil || call == nil || call.Status != "ringing" {
		return
	}
	updated, err := h.callRepo.End(context.Background(), callID, "missed")
	if err != nil || updated == nil {
		return
	}
	h.clearActiveCall(updated)
	h.broadcastCallEvent(updated.CallerID, "call:missed", updated, nil)
	h.broadcastCallEvent(updated.ReceiverID, "call:missed", updated, nil)
	h.createCallActivity(updated)
}

func (h *Handler) expireGroupCall(callID string) {
	time.Sleep(callRingTimeout)
	call, err := h.callRepo.Get(context.Background(), callID)
	if err != nil || call == nil || call.Status != "ringing" {
		return
	}
	// If nobody joined, mark as missed
	activeCount, _ := h.callRepo.CountActiveParticipants(context.Background(), callID)
	// Caller is already counted; if only caller joined, it's missed
	if activeCount <= 1 {
		ctx := context.Background()
		updated, _ := h.callRepo.End(ctx, callID, "missed")
		if updated != nil {
			h.clearGroupActiveCall(ctx, callID)
			parts, _ := h.callRepo.GetParticipants(ctx, callID)
			for _, p := range parts {
				h.broadcastGroupCallEvent(p.UserID, "call:group-missed", updated, nil)
			}
			h.createCallActivity(updated)
		}
	}
}

func (h *Handler) createCallActivity(call *entity.CallSession) {
	if call == nil || call.ConversationID == 0 {
		return
	}
	switch call.Status {
	case "ended", "missed", "rejected", "cancelled":
	default:
		return
	}
	meta := fmt.Sprintf(`{"call_type":%q,"duration_seconds":%d,"caller_id":%d,"status":%q,"is_group":%v}`,
		call.CallType, call.Duration, call.CallerID, call.Status, call.IsGroup)
	h.createCallMessage(call, meta)
}

func (h *Handler) createCallMessage(call *entity.CallSession, meta string) {
	if h.sendMessageUC == nil {
		return
	}
	msgType := call.CallType + "_call"
	msgOut, err := h.sendMessageUC.Execute(context.Background(), messageDTO.SendMessageInput{
		ConversationID: call.ConversationID,
		SenderID:       call.CallerID,
		Content:        meta,
		MessageType:    msgType,
	})
	if err != nil || msgOut == nil {
		return
	}
	h.broadcastCreatedMessage(call.ConversationID, call.CallerID, msgOut)
}

func (h *Handler) callEventPayload(call *entity.CallSession) map[string]any {
	payload := map[string]any{
		"id":               call.ID,
		"call_id":          call.ID,
		"callId":           call.ID,
		"conversation_id":  call.ConversationID,
		"conversationId":   call.ConversationID,
		"caller_id":        call.CallerID,
		"callerId":         call.CallerID,
		"receiver_id":      call.ReceiverID,
		"receiverId":       call.ReceiverID,
		"call_type":        call.CallType,
		"callType":         call.CallType,
		"status":           call.Status,
		"is_group":         call.IsGroup,
		"isGroup":          call.IsGroup,
		"max_participants": call.MaxParticipants,
		"duration_seconds": call.Duration,
		"durationSeconds":  call.Duration,
		"created_at":       call.CreatedAt,
		"createdAt":        call.CreatedAt,
		"updated_at":       call.UpdatedAt,
		"updatedAt":        call.UpdatedAt,
		"expires_at":       call.CreatedAt.Add(callRingTimeout),
		"expiresAt":        call.CreatedAt.Add(callRingTimeout),
	}
	if call.StartedAt != nil {
		payload["started_at"] = call.StartedAt
		payload["startedAt"] = call.StartedAt
	}
	if call.EndedAt != nil {
		payload["ended_at"] = call.EndedAt
		payload["endedAt"] = call.EndedAt
	}
	participants, err := h.conversationRepo.GetParticipants(context.Background(), call.ConversationID)
	if err == nil {
		for _, participant := range participants {
			if participant.ID == call.CallerID {
				payload["caller_name"] = participant.FullName
				payload["callerName"] = participant.FullName
				payload["caller_avatar"] = participant.Avatar
				payload["callerAvatar"] = participant.Avatar
			}
			if participant.ID == call.ReceiverID {
				payload["receiver_name"] = participant.FullName
				payload["receiverName"] = participant.FullName
				payload["receiver_avatar"] = participant.Avatar
				payload["receiverAvatar"] = participant.Avatar
			}
		}
	}
	return payload
}

func (h *Handler) groupCallEventPayload(call *entity.CallSession, participants interface{}) map[string]any {
	payload := h.callEventPayload(call)
	if participants != nil {
		payload["participants"] = participants
	}
	return payload
}

func (h *Handler) clearActiveCall(call *entity.CallSession) {
	h.activeCallsByUser.Delete(call.CallerID)
	h.activeCallsByUser.Delete(call.ReceiverID)
}

func otherCallUser(call *entity.CallSession, userID uint) uint {
	if userID == call.CallerID {
		return call.ReceiverID
	}
	return call.CallerID
}
