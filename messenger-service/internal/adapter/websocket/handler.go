package wsadapter

import (
	"context"
	"encoding/json"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	messageDTO "github.com/tumlumtala/messenger-service/internal/application/dto/message"
	"github.com/tumlumtala/messenger-service/internal/application/usecase/activity"
	"github.com/tumlumtala/messenger-service/internal/application/usecase/conversation"
	"github.com/tumlumtala/messenger-service/internal/application/usecase/message"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/domain/repository"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/notification"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/presence"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/websocket"
	"github.com/tumlumtala/messenger-service/internal/shared/utils"
)

type Handler struct {
	conversationRepo   repository.UserConversationRepository
	callRepo           repository.CallSessionRepository
	createActivityUC   *activity.CreateActivityUseCase
	sendMessageUC      *message.SendMessageUseCase
	markReadUC         *message.MarkReadUseCase
	getConversationsUC *conversation.GetUserConversationsUseCase
	getMessagesUC      *message.GetMessagesByConversationUseCase
	hub                *websocket.Hub
	presence           *presence.Store
	callNotifier       notification.IncomingCallNotifier
	rooms              sync.Map
	clients            sync.Map
	activeCallsByUser  sync.Map
}

type roomState struct {
	ConversationID uint
	Limit          int
	Offset         int
}

type joinRoomRequest struct {
	ConversationID uint `json:"conversation_id"`
	Limit          int  `json:"limit"`
	Offset         int  `json:"offset"`
}

type listConversationsRequest struct {
	RequestID string `json:"request_id"`
	Page      int    `json:"page"`
	Limit     int    `json:"limit"`
	Search    string `json:"search,omitempty"`
}

type listMessagesRequest struct {
	RequestID      string `json:"request_id"`
	ConversationID uint   `json:"conversation_id"`
	Page           int    `json:"page"`
	Limit          int    `json:"limit"`
	Offset         int    `json:"offset"`
}

type sendMessageRequest struct {
	RequestID        string            `json:"request_id,omitempty"`
	ConversationID   uint              `json:"conversation_id"`
	Content          string            `json:"content"`
	MessageType      string            `json:"message_type"`
	ItemID           *uint             `json:"item_id,omitempty"`
	Messages         []sendMessageItem `json:"messages,omitempty"`
	ReplyToMessageID *uint             `json:"reply_to_message_id"`
	TempID           string            `json:"temp_id,omitempty"`
}

type sendMessageItem struct {
	Content  string               `json:"content"`
	Type     string               `json:"type"`
	ItemID   *uint                `json:"item_id,omitempty"`
	Metadata *fileMetadataRequest `json:"metadata,omitempty"`
}

type fileMetadataRequest struct {
	OriginalName string `json:"original_name,omitempty"`
	Size         int64  `json:"size,omitempty"`
	MimeType     string `json:"mime_type,omitempty"`
	Duration     int64  `json:"duration,omitempty"`
}

func NewHandler(
	conversationRepo repository.UserConversationRepository,
	callRepo repository.CallSessionRepository,
	createActivityUC *activity.CreateActivityUseCase,
	sendMessageUC *message.SendMessageUseCase,
	markReadUC *message.MarkReadUseCase,
	getConversationsUC *conversation.GetUserConversationsUseCase,
	getMessagesUC *message.GetMessagesByConversationUseCase,
	hub *websocket.Hub,
	presenceStore *presence.Store,
	callNotifier notification.IncomingCallNotifier,
) *Handler {
	return &Handler{
		conversationRepo:   conversationRepo,
		callRepo:           callRepo,
		createActivityUC:   createActivityUC,
		sendMessageUC:      sendMessageUC,
		markReadUC:         markReadUC,
		getConversationsUC: getConversationsUC,
		getMessagesUC:      getMessagesUC,
		hub:                hub,
		presence:           presenceStore,
		callNotifier:       callNotifier,
	}
}

func (h *Handler) Handle(client *websocket.Client, msg websocket.Message) {
	log.Printf("[WS] user=%d type=%s", client.UserID(), msg.Type)
	switch strings.ToLower(strings.TrimSpace(msg.Type)) {
	case "messenger.subscribe":
		h.handleSubscribe(client)
	case "presence.heartbeat":
		h.handlePresenceHeartbeat(client)
	case "conversations.list":
		h.handleListConversations(client, msg)
	case "messages.list":
		h.handleListMessages(client, msg)
	case "room.join":
		h.handleJoinRoom(client, msg)
	case "message.send":
		h.handleSendMessage(client, msg)
	case "conversation.read":
		h.handleConversationRead(client, msg)
	case "typing.start":
		h.handleTypingStart(client, msg)
	case "typing.stop":
		h.handleTypingStop(client, msg)
	case "message.delivered":
		h.handleMessageDelivered(client, msg)
	case "room.leave":
		h.handleLeaveRoom(client)
	case "call:initiate":
		h.handleCallInitiate(client, msg)
	case "call:accept":
		h.handleCallAccept(client, msg)
	case "call:reject":
		h.handleCallTerminal(client, msg, "rejected", "call:rejected")
	case "call:cancel":
		h.handleCallTerminal(client, msg, "cancelled", "call:cancel")
	case "call:end":
		h.handleCallTerminal(client, msg, "ended", "call:end")
	case "call:failed":
		h.handleCallTerminal(client, msg, "failed", "call:failed")
	case "call:group-join":
		h.handleGroupCallJoin(client, msg)
	case "call:group-status":
		h.handleGroupCallStatus(client, msg)
	case "call:group-heartbeat":
		h.handleGroupCallHeartbeat(client, msg)
	case "call:group-decline":
		h.handleGroupCallDecline(client, msg)
	case "call:group-leave":
		h.handleGroupCallLeave(client, msg)
	case "call:media-state":
		h.handleCallMediaState(client, msg)
	case "call:offer", "call:answer", "call:ice-candidate", "call:reconnect":
		h.handleCallRelay(client, msg)
	default:
		h.sendError(client, domainerrors.MsgUnSupportedMessageType)
	}
}

func (h *Handler) OnDisconnect(client *websocket.Client) {
	h.rooms.Delete(client.ID())
	h.clients.Delete(client.ID())

	if h.presence == nil {
		return
	}
	ctx := context.Background()
	userOffline, err := h.presence.SetOffline(ctx, client.ID(), client.UserID())
	if err != nil {
		log.Printf("[presence] SetOffline error: %v", err)
		return
	}
	if userOffline {
		h.broadcastPresence(ctx, client.UserID(), "offline")
	}
}

func (h *Handler) handlePresenceHeartbeat(client *websocket.Client) {
	if h.presence == nil {
		return
	}
	if err := h.presence.Heartbeat(context.Background(), client.ID(), client.UserID()); err != nil {
		log.Printf("[presence] Heartbeat error: %v", err)
	}
}

func (h *Handler) broadcastPresence(ctx context.Context, userID uint, status string) {
	convIDs, err := h.conversationRepo.GetConversationIDsForUser(ctx, userID)
	if err != nil {
		return
	}
	event, err := websocket.NewMessage("presence.updated", map[string]any{
		"user_id": userID,
		"status":  status,
	})
	if err != nil {
		return
	}
	for _, convID := range convIDs {
		h.hub.BroadcastRoom(channel(convID), event)
	}
}

// handleSubscribe joins the client to their personal user channel, auto-joins ALL of their
// conversation rooms so they receive real-time events regardless of sidebar pagination,
// and confirms subscription.
func (h *Handler) handleSubscribe(client *websocket.Client) {
	ctx := context.Background()
	h.hub.JoinRoom(userChannel(client.UserID()), client)

	// Auto-join every conversation room this user belongs to.
	convIDs, err := h.conversationRepo.GetConversationIDsForUser(ctx, client.UserID())
	if err == nil {
		for _, convID := range convIDs {
			h.hub.JoinRoom(channel(convID), client)
		}
	}

	client.Activate()

	var onlineUserIDs []uint
	if h.presence != nil {
		if err := h.presence.SetOnline(ctx, client.ID(), client.UserID()); err != nil {
			log.Printf("[presence] SetOnline error: %v", err)
		} else {
			h.broadcastPresence(ctx, client.UserID(), "online")
		}

		// Build initial presence snapshot: which of the user's contacts are already online.
		if peerIDs, err := h.conversationRepo.GetParticipantUserIDsForUser(ctx, client.UserID()); err == nil {
			onlineUserIDs, _ = h.presence.GetOnlineUserIDs(ctx, peerIDs)
		}
	}

	resp, _ := websocket.NewMessage("messenger.subscribed", map[string]any{
		"user_id":         client.UserID(),
		"online_user_ids": onlineUserIDs,
	})
	client.Send(resp)
}

// handleListConversations fetches conversations for the user, auto-joins their rooms,
// and returns results in the same format as the REST API.
func (h *Handler) handleListConversations(client *websocket.Client, msg websocket.Message) {
	var req listConversationsRequest
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		h.sendError(client, domainerrors.MsgInvalidPayload)
		return
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 20
	}
	page := req.Page
	if page <= 0 {
		page = 1
	}

	filter := utils.QueryFilter{
		Limit:  limit,
		Page:   page,
		Search: req.Search,
	}

	out, err := h.getConversationsUC.Execute(context.Background(), client.UserID(), filter)
	if err != nil {
		h.sendError(client, "Không thể tải danh sách cuộc trò chuyện")
		return
	}

	// Auto-join all conversation rooms so the client receives real-time events.
	for _, conv := range out.Data {
		h.hub.JoinRoom(channel(conv.ID), client)
	}
	h.clients.Store(client.ID(), client)
	client.Activate()

	resp, _ := websocket.NewMessage("conversations.list.result", map[string]any{
		"request_id":     req.RequestID,
		"data":           out.Data,
		"paginator_info": out.PaginatorInfo,
	})
	client.Send(resp)
}

// handleListMessages fetches messages for a conversation and returns results
// in the same format as the REST API.
func (h *Handler) handleListMessages(client *websocket.Client, msg websocket.Message) {
	var req listMessagesRequest
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		h.sendError(client, domainerrors.MsgInvalidPayload)
		return
	}

	if req.ConversationID == 0 {
		h.sendError(client, domainerrors.MsgInvalidConversationID)
		return
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 50
	}
	page := req.Page
	if page <= 0 {
		page = 1
	}

	filter := utils.QueryFilter{
		Limit:  limit,
		Page:   page,
		Offset: req.Offset,
	}

	result, err := h.getMessagesUC.Execute(
		context.Background(),
		req.ConversationID,
		client.UserID(),
		filter,
	)
	if err != nil {
		h.sendError(client, "Không thể tải tin nhắn")
		return
	}

	// Track client in this conversation room for typing/seen broadcasts.
	h.hub.JoinRoom(channel(req.ConversationID), client)
	h.rooms.Store(client.ID(), roomState{
		ConversationID: req.ConversationID,
		Limit:          limit,
		Offset:         req.Offset,
	})
	h.clients.Store(client.ID(), client)

	resp, _ := websocket.NewMessage("messages.list.result", map[string]any{
		"request_id":      req.RequestID,
		"conversation_id": req.ConversationID,
		"items":           result.Messages,
		"activities":      result.Activities,
		"paginator_info":  result.PaginatorInfo,
	})
	client.Send(resp)
}

func (h *Handler) handleJoinRoom(client *websocket.Client, msg websocket.Message) {
	var req joinRoomRequest
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		h.sendError(client, "Invalid payload")
		return
	}
	if req.ConversationID == 0 {
		h.sendError(client, domainerrors.MsgInvalidConversationID)
		return
	}

	ok, err := h.conversationRepo.IsParticipant(context.Background(), req.ConversationID, client.UserID())
	if err != nil {
		h.sendError(client, domainerrors.MsgCannotJoinConversation)
		return
	}
	if !ok {
		h.sendError(client, domainerrors.MsgCannotJoinConversation)
		return
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 50
	}
	offset := req.Offset
	if offset < 0 {
		offset = 0
	}

	h.hub.JoinRoom(channel(req.ConversationID), client)
	h.rooms.Store(client.ID(), roomState{ConversationID: req.ConversationID, Limit: limit, Offset: offset})
	h.clients.Store(client.ID(), client)
	client.Activate()

	joined, _ := websocket.NewMessage("room.joined", map[string]any{
		"conversation_id": req.ConversationID,
		"limit":           limit,
		"offset":          offset,
	})
	client.Send(joined)
}

func (h *Handler) handleSendMessage(
	client *websocket.Client,
	msg websocket.Message,
) {
	var req sendMessageRequest

	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		h.sendError(client, domainerrors.MsgInvalidPayload)
		return
	}

	if req.ConversationID == 0 {
		h.sendError(client, domainerrors.MsgInvalidConversationID)
		return
	}

	ok, err := h.conversationRepo.IsParticipant(
		context.Background(),
		req.ConversationID,
		client.UserID(),
	)

	if err != nil || !ok {
		h.sendError(client, domainerrors.MsgCannotJoinConversation)
		return
	}

	if len(req.Messages) > 0 {
		h.sendBatchMessages(client, req)
		return
	}

	h.sendSingleMessage(client, req)
}

func (h *Handler) sendSingleMessage(
	client *websocket.Client,
	req sendMessageRequest,
) {
	out, err := h.sendMessageUC.Execute(
		context.Background(),
		messageDTO.SendMessageInput{
			ConversationID:   req.ConversationID,
			SenderID:         client.UserID(),
			Content:          req.Content,
			MessageType:      req.MessageType,
			ItemID:           req.ItemID,
			ReplyToMessageID: req.ReplyToMessageID,
			TempID:           req.TempID,
		},
	)

	if err != nil {
		h.sendError(client, domainerrors.MsgSendMessageFailed)
		return
	}

	ack, _ := websocket.NewMessage("message.send.ack", map[string]any{
		"request_id":      req.RequestID,
		"temp_id":         out.TempID,
		"message_id":      out.ID,
		"seq":             out.Seq,
		"conversation_id": req.ConversationID,
	})
	client.Send(ack)

	h.broadcastCreatedMessage(
		req.ConversationID,
		client.UserID(),
		out,
	)
}

func (h *Handler) sendBatchMessages(
	client *websocket.Client,
	req sendMessageRequest,
) {
	for _, m := range req.Messages {

		var fileMeta *messageDTO.FileMetadata

		if m.Metadata != nil &&
			m.Metadata.OriginalName != "" {

			fileMeta = &messageDTO.FileMetadata{
				OriginalName: m.Metadata.OriginalName,
				Size:         m.Metadata.Size,
				MimeType:     m.Metadata.MimeType,
				Duration:     m.Metadata.Duration,
			}
		}

		out, err := h.sendMessageUC.Execute(
			context.Background(),
			messageDTO.SendMessageInput{
				ConversationID:   req.ConversationID,
				SenderID:         client.UserID(),
				Content:          m.Content,
				MessageType:      m.Type,
				ItemID:           m.ItemID,
				ReplyToMessageID: req.ReplyToMessageID,
				TempID:           req.TempID,
				FileMetadata:     fileMeta,
			},
		)

		if err != nil {
			h.sendError(client, domainerrors.MsgSendMessageFailed)
			return
		}

		h.broadcastCreatedMessage(
			req.ConversationID,
			client.UserID(),
			out,
		)
	}
}

func (h *Handler) broadcastCreatedMessage(
	conversationID uint,
	senderID uint,
	out *messageDTO.SendMessageOutput,
) {
	event, err := websocket.NewMessage("message.created", out)
	if err != nil {
		return
	}

	event.Sender = strconv.FormatUint(uint64(senderID), 10)

	h.hub.BroadcastRoom(channel(conversationID), event)
}

func (h *Handler) handleLeaveRoom(client *websocket.Client) {
	h.rooms.Delete(client.ID())
	h.clients.Delete(client.ID())
	left, _ := websocket.NewMessage("room.left", map[string]any{"ok": true})
	client.Send(left)
}

func (h *Handler) handleConversationRead(client *websocket.Client, msg websocket.Message) {
	var req struct {
		ConversationID uint `json:"conversation_id"`
		MessageID      uint `json:"message_id"`
		LastReadSeq    uint `json:"last_read_seq"`
	}
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		h.sendError(client, "Invalid payload")
		return
	}

	if req.ConversationID == 0 {
		h.sendError(client, domainerrors.MsgInvalidConversationID)
		return
	}

	ok, err := h.conversationRepo.IsParticipant(context.Background(), req.ConversationID, client.UserID())
	if err != nil || !ok {
		h.sendError(client, domainerrors.MsgCannotJoinConversation)
		return
	}

	lastReadSeq := req.LastReadSeq
	if lastReadSeq == 0 {
		lastReadSeq = req.MessageID
	}

	var lastReadSeqPtr *uint
	if lastReadSeq > 0 {
		lastReadSeqPtr = &lastReadSeq
	}

	if err := h.markReadUC.Execute(context.Background(), req.ConversationID, client.UserID(), lastReadSeqPtr); err != nil {
		h.sendError(client, domainerrors.MsgMarkReadFailed)
		return
	}

	event, _ := websocket.NewMessage("message.seen", map[string]any{
		"last_read_seq":   lastReadSeq,
		"user_id":         client.UserID(),
		"conversation_id": req.ConversationID,
		"seen_at":         time.Now().Format(time.RFC3339),
	})
	event.Sender = strconv.FormatUint(uint64(client.UserID()), 10)
	h.hub.BroadcastRoom(channel(req.ConversationID), event)
}

func (h *Handler) handleTypingStart(client *websocket.Client, msg websocket.Message) {
	var req struct {
		ConversationID uint `json:"conversation_id"`
	}
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		h.sendError(client, "Invalid payload")
		return
	}

	if req.ConversationID == 0 {
		h.sendError(client, domainerrors.MsgInvalidConversationID)
		return
	}

	ok, err := h.conversationRepo.IsParticipant(context.Background(), req.ConversationID, client.UserID())
	if err != nil || !ok {
		h.sendError(client, domainerrors.MsgCannotJoinConversation)
		return
	}

	event, _ := websocket.NewMessage("typing.start", map[string]any{
		"user_id":         client.UserID(),
		"conversation_id": req.ConversationID,
	})
	event.Sender = strconv.FormatUint(uint64(client.UserID()), 10)
	h.hub.BroadcastRoom(channel(req.ConversationID), event)
}

func (h *Handler) handleTypingStop(client *websocket.Client, msg websocket.Message) {
	var req struct {
		ConversationID uint `json:"conversation_id"`
	}
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		h.sendError(client, "Invalid payload")
		return
	}
	if req.ConversationID == 0 {
		h.sendError(client, domainerrors.MsgInvalidConversationID)
		return
	}

	ok, err := h.conversationRepo.IsParticipant(context.Background(), req.ConversationID, client.UserID())
	if err != nil || !ok {
		h.sendError(client, domainerrors.MsgCannotJoinConversation)
		return
	}

	event, _ := websocket.NewMessage("typing.stop", map[string]any{
		"user_id":         client.UserID(),
		"conversation_id": req.ConversationID,
	})
	event.Sender = strconv.FormatUint(uint64(client.UserID()), 10)
	h.hub.BroadcastRoom(channel(req.ConversationID), event)
}

func (h *Handler) handleMessageDelivered(client *websocket.Client, msg websocket.Message) {
	var req struct {
		ConversationID uint `json:"conversation_id"`
		MessageSeq     uint `json:"message_seq"`
	}
	if err := json.Unmarshal(msg.Payload, &req); err != nil {
		h.sendError(client, "Invalid payload")
		return
	}
	if req.ConversationID == 0 || req.MessageSeq == 0 {
		h.sendError(client, domainerrors.MsgInvalidPayload)
		return
	}

	ok, err := h.conversationRepo.IsParticipant(context.Background(), req.ConversationID, client.UserID())
	if err != nil || !ok {
		h.sendError(client, domainerrors.MsgCannotJoinConversation)
		return
	}

	event, _ := websocket.NewMessage("message.delivered", map[string]any{
		"conversation_id": req.ConversationID,
		"message_seq":     req.MessageSeq,
		"user_id":         client.UserID(),
	})
	event.Sender = strconv.FormatUint(uint64(client.UserID()), 10)
	h.broadcastToConversation(req.ConversationID, event, "")
}

func (h *Handler) UpdatePagination(userID, conversationID uint, limit, offset int) {
	h.clients.Range(func(_, value any) bool {
		client, ok := value.(*websocket.Client)
		if !ok || client.UserID() != userID {
			return true
		}

		v, ok := h.rooms.Load(client.ID())
		if !ok {
			return true
		}

		state, ok := v.(roomState)
		if !ok || state.ConversationID != conversationID {
			return true
		}

		if offset < state.Offset {
			return true
		}

		if state.Limit == limit && state.Offset == offset {
			return true
		}

		state.Limit = limit
		state.Offset = offset
		h.rooms.Store(client.ID(), state)

		updated, err := websocket.NewMessage("messages_pagination_updated", map[string]any{
			"conversation_id": conversationID,
			"limit":           limit,
			"offset":          offset,
		})
		if err == nil {
			client.Send(updated)
		}

		return true
	})
}

func (h *Handler) sendError(client *websocket.Client, text string) {
	m, err := websocket.NewMessage("error", map[string]any{"message": text})
	if err != nil {
		return
	}
	client.Send(m)
}

// broadcastToConversation sends to locally-tracked clients (used for typing indicators and delivery receipts).
func (h *Handler) broadcastToConversation(conversationID uint, msg websocket.Message, excludeClientID string) {
	h.clients.Range(func(_, value any) bool {
		client, ok := value.(*websocket.Client)
		if !ok {
			return true
		}
		if excludeClientID != "" && client.ID() == excludeClientID {
			return true
		}

		v, ok := h.rooms.Load(client.ID())
		if !ok {
			return true
		}
		state, ok := v.(roomState)
		if !ok || state.ConversationID != conversationID {
			return true
		}

		client.Send(msg)
		return true
	})
}

func channel(conversationID uint) string {
	return "messenger:conversation:" + strconv.FormatUint(uint64(conversationID), 10)
}

func userChannel(userID uint) string {
	return "messenger:user:" + strconv.FormatUint(uint64(userID), 10)
}
