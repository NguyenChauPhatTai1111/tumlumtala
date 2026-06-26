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
	ReceiverID     uint   `json:"receiver_id"`
	CallType       string `json:"call_type"`
}

type callIDRequest struct {
	CallID string `json:"call_id"`
}

func (h *Handler) handleCallInitiate(client *websocket.Client, msg websocket.Message) {
	var req callInitiateRequest
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		h.sendError(client, "Invalid call payload")
		return
	}
	if req.ConversationID == 0 || req.ReceiverID == 0 || (req.CallType != "audio" && req.CallType != "video") {
		h.sendError(client, "Invalid call payload")
		return
	}
	if req.ReceiverID == client.UserID() {
		h.sendError(client, "Cannot call yourself")
		return
	}
	if !h.canCallParticipant(req.ConversationID, client.UserID(), req.ReceiverID) {
		h.sendError(client, "Cannot start call in this conversation")
		return
	}

	if _, busy := h.activeCallsByUser.Load(req.ReceiverID); busy {
		call := h.newCall(req, client.UserID(), "busy")
		_ = h.callRepo.Create(context.Background(), call)
		h.sendCallEvent(client, "call:busy", call)
		return
	}
	if _, busy := h.activeCallsByUser.Load(client.UserID()); busy {
		call := h.newCall(req, client.UserID(), "busy")
		_ = h.callRepo.Create(context.Background(), call)
		h.sendCallEvent(client, "call:busy", call)
		return
	}

	call := h.newCall(req, client.UserID(), "ringing")
	if err := h.callRepo.Create(context.Background(), call); err != nil {
		h.sendError(client, "Cannot create call")
		return
	}

	h.activeCallsByUser.Store(client.UserID(), call.ID)
	h.activeCallsByUser.Store(req.ReceiverID, call.ID)
	h.sendCallEvent(client, "call:ringing", call)
	h.broadcastCallEvent(req.ReceiverID, "call:incoming", call)
	go h.notifyIncomingCall(call)
	go h.expireRingingCall(call.ID)
}

func (h *Handler) handleCallAccept(client *websocket.Client, msg websocket.Message) {
	call := h.callFromMessage(client, msg)
	if call == nil {
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
	h.sendCallEvent(client, "call:accept", updated)
	h.broadcastCallEvent(otherCallUser(updated, client.UserID()), "call:accept", updated)
}

func (h *Handler) handleCallTerminal(client *websocket.Client, msg websocket.Message, status string, eventType string) {
	call := h.callFromMessage(client, msg)
	if call == nil {
		return
	}
	updated, err := h.callRepo.End(context.Background(), call.ID, status)
	if err != nil || updated == nil {
		h.sendError(client, "Cannot update call")
		return
	}
	h.clearActiveCall(updated)
	h.sendCallEvent(client, eventType, updated)
	h.broadcastCallEvent(otherCallUser(updated, client.UserID()), eventType, updated)
	go h.createCallActivity(updated)
}

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
	h.hub.BroadcastRoom(userChannel(otherCallUser(call, client.UserID())), relay)
}

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
	if client.UserID() != call.CallerID && client.UserID() != call.ReceiverID {
		h.sendError(client, "Unauthorized call")
		return nil
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
		ID:             uuid.NewString(),
		ConversationID: req.ConversationID,
		CallerID:       callerID,
		ReceiverID:     req.ReceiverID,
		CallType:       req.CallType,
		Status:         status,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

func (h *Handler) sendCallEvent(client *websocket.Client, eventType string, call *entity.CallSession) {
	msg, err := websocket.NewMessage(eventType, h.callEventPayload(call))
	if err != nil {
		return
	}
	client.Send(msg)
}

func (h *Handler) broadcastCallEvent(userID uint, eventType string, call *entity.CallSession) {
	msg, err := websocket.NewMessage(eventType, h.callEventPayload(call))
	if err != nil {
		return
	}
	h.hub.BroadcastRoom(userChannel(userID), msg)
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
	h.broadcastCallEvent(updated.CallerID, "call:missed", updated)
	h.broadcastCallEvent(updated.ReceiverID, "call:missed", updated)
	h.createCallActivity(updated)
}

func (h *Handler) createCallActivity(call *entity.CallSession) {
	if call == nil || call.ConversationID == 0 {
		return
	}
	// Only record meaningful terminal states.
	switch call.Status {
	case "ended", "missed", "rejected", "cancelled":
	default:
		return
	}
	meta := fmt.Sprintf(`{"call_type":%q,"duration_seconds":%d,"caller_id":%d,"status":%q}`,
		call.CallType, call.Duration, call.CallerID, call.Status)

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
