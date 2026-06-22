package http

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	conversationDTO "github.com/tumlumtala/messenger-service/internal/application/dto/conversation"
	messageDTO "github.com/tumlumtala/messenger-service/internal/application/dto/message"
	conversationUC "github.com/tumlumtala/messenger-service/internal/application/usecase/conversation"
	messageHistoryUC "github.com/tumlumtala/messenger-service/internal/application/usecase/history"
	messageUC "github.com/tumlumtala/messenger-service/internal/application/usecase/message"
	domainerrors "github.com/tumlumtala/messenger-service/internal/domain/errors"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/persistence/model"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/websocket"
	"github.com/tumlumtala/messenger-service/internal/shared/utils"
)

type messagePaginationSync interface {
	UpdatePagination(userID, conversationID uint, limit, offset int)
}

type MessengerHandler struct {
	db                    *gorm.DB
	createConversationUC  *conversationUC.CreateConversationUseCase
	getConversationsUC    *conversationUC.GetUserConversationsUseCase
	renameConversationUC  *conversationUC.RenameConversationUseCase
	addMembersUC          *conversationUC.AddMembersUseCase
	removeMemberUC        *conversationUC.RemoveMemberUseCase
	changeBackgroundUC    *conversationUC.ChangeBackgroundUseCase
	toggleNotificationsUC *conversationUC.ToggleNotificationsUseCase
	getParticipantsUC     *conversationUC.GetParticipantsUseCase
	setNicknameUC         *conversationUC.SetNicknameUseCase
	setQuickReactionUC    *conversationUC.SetQuickReactionUseCase
	changeAvatarUC        *conversationUC.ChangeAvatarUseCase
	leaveGroupUC          *conversationUC.LeaveGroupUseCase
	archiveConversationUC *conversationUC.ArchiveConversationUseCase
	restoreConversationUC *conversationUC.RestoreConversationUseCase
	deleteConversationUC  *conversationUC.DeleteConversationUseCase
	sendMessageUC         *messageUC.SendMessageUseCase
	getMessagesUC         *messageUC.GetMessagesByConversationUseCase
	searchMessagesUC      *messageUC.SearchMessagesUseCase
	searchAllMessagesUC   *messageUC.SearchAllMessagesUseCase
	markReadUC            *messageUC.MarkReadUseCase
	updateMessageUC       *messageUC.UpdateMessageUseCase
	deleteMessageUC       *messageUC.DeleteMessageUseCase
	setReactionUC         *messageUC.SetReactionUseCase
	removeReactionUC      *messageUC.RemoveReactionUseCase
	getMessageHistoryUC   *messageHistoryUC.GetMessageHistoryUseCase
	mediaUploadService    *conversationUC.MediaUploadService
	paginationSync        messagePaginationSync
	hub                   *websocket.Hub
}

func NewMessengerHandler(
	db *gorm.DB,
	createConversationUC *conversationUC.CreateConversationUseCase,
	getConversationsUC *conversationUC.GetUserConversationsUseCase,
	renameConversationUC *conversationUC.RenameConversationUseCase,
	addMembersUC *conversationUC.AddMembersUseCase,
	removeMemberUC *conversationUC.RemoveMemberUseCase,
	changeBackgroundUC *conversationUC.ChangeBackgroundUseCase,
	toggleNotificationsUC *conversationUC.ToggleNotificationsUseCase,
	getParticipantsUC *conversationUC.GetParticipantsUseCase,
	setNicknameUC *conversationUC.SetNicknameUseCase,
	setQuickReactionUC *conversationUC.SetQuickReactionUseCase,
	changeAvatarUC *conversationUC.ChangeAvatarUseCase,
	leaveGroupUC *conversationUC.LeaveGroupUseCase,
	archiveConversationUC *conversationUC.ArchiveConversationUseCase,
	restoreConversationUC *conversationUC.RestoreConversationUseCase,
	deleteConversationUC *conversationUC.DeleteConversationUseCase,
	sendMessageUC *messageUC.SendMessageUseCase,
	getMessagesUC *messageUC.GetMessagesByConversationUseCase,
	searchMessagesUC *messageUC.SearchMessagesUseCase,
	searchAllMessagesUC *messageUC.SearchAllMessagesUseCase,
	markReadUC *messageUC.MarkReadUseCase,
	updateMessageUC *messageUC.UpdateMessageUseCase,
	deleteMessageUC *messageUC.DeleteMessageUseCase,
	setReactionUC *messageUC.SetReactionUseCase,
	removeReactionUC *messageUC.RemoveReactionUseCase,
	getMessageHistoryUC *messageHistoryUC.GetMessageHistoryUseCase,
	mediaUploadService *conversationUC.MediaUploadService,
	paginationSync messagePaginationSync,
	hub *websocket.Hub,
) *MessengerHandler {
	return &MessengerHandler{
		db:                    db,
		createConversationUC:  createConversationUC,
		getConversationsUC:    getConversationsUC,
		renameConversationUC:  renameConversationUC,
		addMembersUC:          addMembersUC,
		removeMemberUC:        removeMemberUC,
		changeBackgroundUC:    changeBackgroundUC,
		toggleNotificationsUC: toggleNotificationsUC,
		getParticipantsUC:     getParticipantsUC,
		setNicknameUC:         setNicknameUC,
		setQuickReactionUC:    setQuickReactionUC,
		changeAvatarUC:        changeAvatarUC,
		leaveGroupUC:          leaveGroupUC,
		archiveConversationUC: archiveConversationUC,
		restoreConversationUC: restoreConversationUC,
		deleteConversationUC:  deleteConversationUC,
		sendMessageUC:         sendMessageUC,
		getMessagesUC:         getMessagesUC,
		searchMessagesUC:      searchMessagesUC,
		searchAllMessagesUC:   searchAllMessagesUC,
		markReadUC:            markReadUC,
		updateMessageUC:       updateMessageUC,
		deleteMessageUC:       deleteMessageUC,
		setReactionUC:         setReactionUC,
		removeReactionUC:      removeReactionUC,
		getMessageHistoryUC:   getMessageHistoryUC,
		mediaUploadService:    mediaUploadService,
		paginationSync:        paginationSync,
		hub:                   hub,
	}
}

// userIDFromContext reads the user_id set by the JWT middleware.
func userIDFromContext(c *gin.Context) (uint, bool) {
	v, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}
	switch uid := v.(type) {
	case uint:
		return uid, true
	case float64:
		return uint(uid), true
	case int:
		return uint(uid), true
	case int64:
		return uint(uid), true
	}
	return 0, false
}

func (h *MessengerHandler) CreateConversation(c *gin.Context) {
	var req CreateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ResponseBadRequest(c, err.Error())
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	out, err := h.createConversationUC.Execute(c.Request.Context(), conversationDTO.CreateConversationInput{
		UserID:         userID,
		IsGroup:        req.IsGroup,
		Name:           req.Name,
		ParticipantIDs: req.ParticipantIDs,
	})
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	wsMsg, err := websocket.NewMessage("conversation.updated", map[string]any{
		"conversation_id": out.ID,
	})
	if err == nil {
		for _, pID := range out.ParticipantIDs {
			h.hub.BroadcastRoom("messenger:user:"+strconv.FormatUint(uint64(pID), 10), wsMsg)
		}
	}

	ResponseSuccess(c, http.StatusCreated, "Tạo cuộc trò chuyện thành công", out)
}

func (h *MessengerHandler) GetConversations(c *gin.Context) {
	var params QueryFilter
	if err := c.ShouldBindQuery(&params); err != nil {
		ResponseBadRequest(c, err.Error())
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	filter := utils.QueryFilter{
		Search: params.Search,
		Order:  params.Order,
		Sort:   params.Sort,
		Limit:  params.Limit,
		Page:   params.Page,
	}

	out, err := h.getConversationsUC.Execute(c.Request.Context(), userID, filter)
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	ResponseSuccess(c, http.StatusOK, "Lấy danh sách cuộc trò chuyện thành công", gin.H{
		"data":           out.Data,
		"paginator_info": out.PaginatorInfo,
	})
}

func (h *MessengerHandler) RenameConversation(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	var req RenameConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ResponseBadRequest(c, err.Error())
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	err = h.renameConversationUC.Execute(c.Request.Context(), uint(convID), userID, conversationDTO.RenameConversationRequest{Name: req.Name})
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	h.notifyConversationUpdated(c, uint(convID), userID)

	ResponseSuccess(c, http.StatusOK, "Đổi tên cuộc trò chuyện thành công", gin.H{"conversation_id": uint(convID)})
}

func (h *MessengerHandler) AddMembers(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	var req AddMembersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ResponseBadRequest(c, err.Error())
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	err = h.addMembersUC.Execute(c.Request.Context(), uint(convID), userID, conversationDTO.AddMembersRequest{UserIDs: req.UserIDs})
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	h.notifyConversationUpdated(c, uint(convID), userID)

	ResponseSuccess(c, http.StatusOK, "Thêm thành viên thành công", gin.H{"conversation_id": uint(convID)})
}

func (h *MessengerHandler) RemoveMember(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	targetUserID, err := strconv.ParseUint(c.Param("user_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidUserID)
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	// Fetch participants list first so we can notify them after removal.
	participants, _ := h.getParticipantsUC.Execute(c.Request.Context(), uint(convID), userID)

	err = h.removeMemberUC.Execute(c.Request.Context(), uint(convID), userID, uint(targetUserID))
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	// Notify all participants (including the removed one so they know they are removed).
	wsMsg, wsErr := websocket.NewMessage("conversation.updated", map[string]any{
		"conversation_id": uint(convID),
	})
	if wsErr == nil {
		for _, p := range participants {
			h.hub.BroadcastRoom("messenger:user:"+strconv.FormatUint(uint64(p.ID), 10), wsMsg)
		}
	}

	ResponseSuccess(c, http.StatusOK, "Xóa thành viên thành công", gin.H{"conversation_id": uint(convID), "target_user_id": uint(targetUserID)})
}

func (h *MessengerHandler) ChangeBackground(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	var req ChangeBackgroundRequest
	if err := c.ShouldBind(&req); err != nil {
		ResponseBadRequest(c, err.Error())
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	if req.ThemeID == 0 {
		ResponseBadRequest(c, "theme_id is required")
		return
	}

	if h.mediaUploadService != nil {
		fileHeader, fileErr := c.FormFile("file")
		if fileErr == nil {
			assetURL, uploadErr := h.mediaUploadService.UploadConversationTheme(c.Request.Context(), uint(convID), fileHeader)
			if uploadErr != nil {
				ResponseBadRequest(c, domainerrors.MsgFailedToUploadAsset)
				return
			}
			req.ThemeURL = &assetURL
		}
	}

	err = h.changeBackgroundUC.Execute(c.Request.Context(), uint(convID), userID, conversationDTO.ChangeBackgroundRequest{
		ThemeID:                   req.ThemeID,
		ThemeURL:                  req.ThemeURL,
		CustomIncomingBubbleColor: req.CustomIncomingBubbleColor,
		CustomOutgoingBubbleColor: req.CustomOutgoingBubbleColor,
		CustomIncomingTextColor:   req.CustomIncomingTextColor,
		CustomOutgoingTextColor:   req.CustomOutgoingTextColor,
	})
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	h.notifyConversationUpdated(c, uint(convID), userID)

	ResponseSuccess(c, http.StatusOK, "Thay đổi nền cuộc trò chuyện thành công", gin.H{"conversation_id": uint(convID)})
}

func (h *MessengerHandler) ToggleNotifications(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	var req ToggleNotificationsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ResponseBadRequest(c, err.Error())
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	err = h.toggleNotificationsUC.Execute(c.Request.Context(), uint(convID), userID, conversationDTO.ToggleNotificationsRequest{Enabled: req.Enabled})
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	ResponseSuccess(c, http.StatusOK, "Cập nhật thông báo thành công", gin.H{"conversation_id": uint(convID), "enabled": req.Enabled})
}

func (h *MessengerHandler) ChangeAvatar(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	var req ChangeAvatarRequest
	if err := c.ShouldBind(&req); err != nil {
		ResponseBadRequest(c, err.Error())
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	if h.mediaUploadService != nil {
		fileHeader, fileErr := c.FormFile("file")
		if fileErr == nil {
			assetURL, uploadErr := h.mediaUploadService.UploadConversationAvatar(c.Request.Context(), uint(convID), fileHeader)
			if uploadErr != nil {
				ResponseBadRequest(c, domainerrors.MsgFailedToUploadAsset)
				return
			}
			req.Avatar = assetURL
		}
	}

	if strings.TrimSpace(req.Avatar) == "" {
		ResponseBadRequest(c, "avatar is required")
		return
	}

	err = h.changeAvatarUC.Execute(c.Request.Context(), uint(convID), userID, conversationDTO.ChangeAvatarRequest{Avatar: req.Avatar})
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	h.notifyConversationUpdated(c, uint(convID), userID)

	ResponseSuccess(c, http.StatusOK, "Thay đổi ảnh đại diện thành công", gin.H{"conversation_id": uint(convID)})
}

func (h *MessengerHandler) GetParticipants(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	out, err := h.getParticipantsUC.Execute(c.Request.Context(), uint(convID), userID)
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	ResponseSuccess(c, http.StatusOK, "Lấy danh sách thành viên thành công", out)
}

func (h *MessengerHandler) SetNickname(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}
	targetUserID, err := strconv.ParseUint(c.Param("target_user_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidUserID)
		return
	}

	var req SetNicknameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ResponseBadRequest(c, err.Error())
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	err = h.setNicknameUC.Execute(c.Request.Context(), uint(convID), userID, uint(targetUserID), conversationDTO.SetNicknameRequest{Nickname: req.Nickname})
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	ResponseSuccess(c, http.StatusOK, "Đặt biệt danh thành công", gin.H{"conversation_id": uint(convID), "target_user_id": uint(targetUserID)})
}

func (h *MessengerHandler) SearchMessages(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	query := c.Query("query")
	if query == "" {
		ResponseBadRequest(c, "query is required")
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "0"))
	if offset <= 0 && page > 0 {
		offset = (page - 1) * limit
	}

	out, total, err := h.searchMessagesUC.Execute(c.Request.Context(), uint(convID), userID, messageDTO.SearchMessagesRequest{
		Query:  query,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	pagination := gin.H{"limit": limit, "offset": offset, "total": total}
	ResponseSuccess(c, http.StatusOK, "Tìm kiếm tin nhắn thành công", gin.H{"data": out, "pagination": pagination})
}

func (h *MessengerHandler) SearchAllMessages(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	query := c.Query("query")
	if query == "" {
		ResponseBadRequest(c, "query is required")
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	out, err := h.searchAllMessagesUC.Execute(c.Request.Context(), userID, messageDTO.SearchMessagesRequest{
		Query: query,
		Limit: limit,
	}, page)
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	ResponseSuccess(c, http.StatusOK, "Tìm kiếm tin nhắn thành công", out)
}

func (h *MessengerHandler) SetQuickReaction(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	var req SetQuickReactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ResponseBadRequest(c, err.Error())
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	err = h.setQuickReactionUC.Execute(c.Request.Context(), uint(convID), userID, conversationDTO.SetQuickReactionRequest{QuickReaction: req.QuickReaction})
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	ResponseSuccess(c, http.StatusOK, "Đặt reaction nhanh thành công", gin.H{"conversation_id": uint(convID)})
}

func (h *MessengerHandler) LeaveGroup(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	// Fetch participants list first so we can notify them after leaving.
	participants, _ := h.getParticipantsUC.Execute(c.Request.Context(), uint(convID), userID)

	err = h.leaveGroupUC.Execute(c.Request.Context(), uint(convID), userID)
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	// Notify all participants (including the leaving one so they know they left).
	wsMsg, wsErr := websocket.NewMessage("conversation.updated", map[string]any{
		"conversation_id": uint(convID),
	})
	if wsErr == nil {
		for _, p := range participants {
			h.hub.BroadcastRoom("messenger:user:"+strconv.FormatUint(uint64(p.ID), 10), wsMsg)
		}
	}

	ResponseSuccess(c, http.StatusOK, "Rời nhóm thành công", gin.H{"conversation_id": uint(convID)})
}

func (h *MessengerHandler) SendMessage(c *gin.Context) {
	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ResponseBadRequest(c, err.Error())
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	var out *messageDTO.SendMessageOutput

	if len(req.Messages) > 0 {
		for _, msg := range req.Messages {
			var fileMeta *messageDTO.FileMetadata
			if msg.Metadata != nil && msg.Metadata.OriginalName != "" {
				fileMeta = &messageDTO.FileMetadata{
					OriginalName: msg.Metadata.OriginalName,
					Size:         msg.Metadata.Size,
					MimeType:     msg.Metadata.MimeType,
					Duration:     msg.Metadata.Duration,
				}
			}
			input := messageDTO.SendMessageInput{
				ConversationID:   req.ConversationID,
				SenderID:         userID,
				Content:          msg.Content,
				MessageType:      msg.Type,
				ItemID:           msg.ItemID,
				ReplyToMessageID: req.ReplyToMessageID,
				TempID:           req.TempID,
				FileMetadata:     fileMeta,
			}

			current, err := h.sendMessageUC.Execute(c.Request.Context(), input)
			if err != nil {
				ResponseDomainError(c, err)
				return
			}

			out = current
			h.broadcastNewMessage(c, userID, req.ConversationID, current)
		}
	} else {
		input := messageDTO.SendMessageInput{
			ConversationID:   req.ConversationID,
			SenderID:         userID,
			Content:          req.Content,
			MessageType:      req.MessageType,
			ItemID:           req.ItemID,
			ReplyToMessageID: req.ReplyToMessageID,
			TempID:           req.TempID,
		}

		current, err := h.sendMessageUC.Execute(c.Request.Context(), input)
		if err != nil {
			ResponseDomainError(c, err)
			return
		}

		out = current
		h.broadcastNewMessage(c, userID, req.ConversationID, current)
	}

	if out == nil {
		ResponseBadRequest(c, "no messages to send")
		return
	}

	ResponseSuccess(c, http.StatusOK, "Gửi tin nhắn thành công", out)
}

func (h *MessengerHandler) broadcastNewMessage(c *gin.Context, senderID uint, convID uint, data *messageDTO.SendMessageOutput) {
	msg, err := websocket.NewMessage("message.created", data)
	if err == nil {
		msg.Sender = strconv.FormatUint(uint64(senderID), 10)
		h.hub.BroadcastRoom(messengerChannel(convID), msg)
	}
}

func (h *MessengerHandler) UploadMessageAttachment(c *gin.Context) {
	convID, err := strconv.ParseUint(c.PostForm("conversation_id"), 10, 32)
	if err != nil || convID == 0 {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	if h.mediaUploadService == nil {
		ResponseInternalError(c)
		return
	}

	fileHeader, fileErr := c.FormFile("file")
	if fileErr != nil {
		ResponseBadRequest(c, fileErr.Error())
		return
	}

	assetURL, uploadErr := h.mediaUploadService.UploadMessageAttachment(c.Request.Context(), uint(convID), fileHeader)
	if uploadErr != nil {
		ResponseBadRequest(c, domainerrors.MsgFailedToUploadAsset)
		return
	}

	ResponseSuccess(c, http.StatusOK, "Upload message attachment success", gin.H{"path": assetURL})
}

func (h *MessengerHandler) GetMessages(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	var params QueryFilter
	if err := c.ShouldBindQuery(&params); err != nil {
		ResponseBadRequest(c, err.Error())
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	limit, limitErr := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limitErr != nil || limit <= 0 {
		limit = 20
	}

	page, pageErr := strconv.Atoi(c.DefaultQuery("page", "1"))
	if pageErr != nil || page <= 0 {
		page = 1
	}

	offset, offsetErr := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if offsetErr != nil || offset < 0 {
		offset = 0
	}

	filter := utils.QueryFilter{
		Search: params.Search,
		Order:  params.Order,
		Sort:   params.Sort,
		Limit:  limit,
		Page:   page,
		Offset: offset,
		ExtraFilters: map[string]string{
			"message_type": c.Query("message_type"),
		},
	}

	out, err := h.getMessagesUC.Execute(c.Request.Context(), uint(convID), userID, filter)
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	if h.paginationSync != nil {
		effectiveLimit := int(out.PaginatorInfo.Limit)
		effectiveOffset := offset
		if effectiveOffset == 0 && page > 1 {
			effectiveOffset = (page - 1) * effectiveLimit
		}
		h.paginationSync.UpdatePagination(userID, uint(convID), effectiveLimit, effectiveOffset)
	}

	ResponseSuccess(c, http.StatusOK, "Lấy tin nhắn thành công", gin.H{
		"items":          out.Messages,
		"activities":     out.Activities,
		"paginator_info": out.PaginatorInfo,
	})
}

func (h *MessengerHandler) MarkRead(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	var req struct {
		LastReadSeq *uint `json:"last_read_seq"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		req.LastReadSeq = nil
	}

	if err := h.markReadUC.Execute(c.Request.Context(), uint(convID), userID, req.LastReadSeq); err != nil {
		ResponseDomainError(c, err)
		return
	}

	ResponseSuccess(c, http.StatusOK, "Đánh dấu đã đọc thành công", ReadReceiptResponse{
		ConversationID: uint(convID),
		UserID:         userID,
		ReadAt:         time.Now(),
	})
}

func (h *MessengerHandler) ArchiveConversation(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	if err := h.archiveConversationUC.Execute(c.Request.Context(), uint(convID), userID); err != nil {
		ResponseDomainError(c, err)
		return
	}

	ResponseSuccess(c, http.StatusOK, "Lưu trữ cuộc trò chuyện thành công", gin.H{"conversation_id": uint(convID)})
}

func (h *MessengerHandler) RestoreConversation(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	if err := h.restoreConversationUC.Execute(c.Request.Context(), uint(convID), userID); err != nil {
		ResponseDomainError(c, err)
		return
	}

	ResponseSuccess(c, http.StatusOK, "Khôi phục cuộc trò chuyện thành công", gin.H{"conversation_id": uint(convID)})
}

func (h *MessengerHandler) DeleteConversation(c *gin.Context) {
	convID, err := strconv.ParseUint(c.Param("conversation_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidConversationID)
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	if err := h.deleteConversationUC.Execute(c.Request.Context(), uint(convID), userID); err != nil {
		ResponseDomainError(c, err)
		return
	}

	ResponseSuccess(c, http.StatusOK, "Xóa cuộc trò chuyện thành công", gin.H{"conversation_id": uint(convID)})
}

func (h *MessengerHandler) GetMessageHistory(c *gin.Context) {
	messageID, err := strconv.ParseUint(c.Param("message_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidMessageID)
		return
	}

	out, err := h.getMessageHistoryUC.Execute(c.Request.Context(), uint(messageID))
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	ResponseSuccess(c, http.StatusOK, "Lấy lịch sử tin nhắn thành công", out)
}

func (h *MessengerHandler) DeleteMessage(c *gin.Context) {
	messageID, err := strconv.ParseUint(c.Param("message_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidMessageID)
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	conversationID, err := h.deleteMessageUC.Execute(c.Request.Context(), uint(messageID), userID)
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	if conversationID > 0 {
		wsMsg, wsErr := websocket.NewMessage("message.deleted", map[string]any{
			"message_id":      uint(messageID),
			"conversation_id": conversationID,
		})
		if wsErr == nil {
			wsMsg.Sender = strconv.FormatUint(uint64(userID), 10)
			h.hub.BroadcastRoom(messengerChannel(conversationID), wsMsg)
		}
	}

	ResponseSuccess(c, http.StatusOK, "Xóa tin nhắn thành công", gin.H{"message_id": uint(messageID)})
}

func (h *MessengerHandler) UpdateMessage(c *gin.Context) {
	messageID, err := strconv.ParseUint(c.Param("message_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidMessageID)
		return
	}

	var req UpdateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ResponseBadRequest(c, err.Error())
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	out, err := h.updateMessageUC.Execute(c.Request.Context(), messageDTO.UpdateMessageInput{
		MessageID: uint(messageID),
		UserID:    userID,
		Content:   req.Content,
	})
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	msg, wsErr := websocket.NewMessage("message.updated", out)
	if wsErr == nil {
		msg.Sender = strconv.FormatUint(uint64(userID), 10)
		h.hub.BroadcastRoom(messengerChannel(out.ConversationID), msg)
	}

	ResponseSuccess(c, http.StatusOK, "Cập nhật tin nhắn thành công", out)
}

func (h *MessengerHandler) SetReaction(c *gin.Context) {
	messageID, err := strconv.ParseUint(c.Param("message_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidMessageID)
		return
	}

	var req SetReactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ResponseBadRequest(c, err.Error())
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	out, err := h.setReactionUC.Execute(c.Request.Context(), messageDTO.SetReactionInput{
		MessageID: uint(messageID),
		UserID:    userID,
		Reaction:  req.Reaction,
	})
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	msg, wsErr := websocket.NewMessage("reaction_updated", out)
	if wsErr == nil {
		msg.Sender = strconv.FormatUint(uint64(userID), 10)
		h.hub.BroadcastRoom(messengerChannel(out.ConversationID), msg)
	}

	ResponseSuccess(c, http.StatusOK, "Đặt reaction thành công", out)
}

func (h *MessengerHandler) RemoveReaction(c *gin.Context) {
	messageID, err := strconv.ParseUint(c.Param("message_id"), 10, 32)
	if err != nil {
		ResponseBadRequest(c, domainerrors.MsgInvalidMessageID)
		return
	}

	userID, ok := userIDFromContext(c)
	if !ok {
		ResponseUnauthorized(c)
		return
	}

	out, err := h.removeReactionUC.Execute(c.Request.Context(), messageDTO.RemoveReactionInput{
		MessageID: uint(messageID),
		UserID:    userID,
	})
	if err != nil {
		ResponseDomainError(c, err)
		return
	}

	msg, wsErr := websocket.NewMessage("reaction_removed", out)
	if wsErr == nil {
		msg.Sender = strconv.FormatUint(uint64(userID), 10)
		h.hub.BroadcastRoom(messengerChannel(out.ConversationID), msg)
	}

	ResponseSuccess(c, http.StatusOK, "Gỡ reaction thành công", out)
}

func messengerChannel(conversationID uint) string {
	return "messenger:conversation:" + strconv.FormatUint(uint64(conversationID), 10)
}

// GetEmojis returns all emojis, optionally filtered by status.
func (h *MessengerHandler) GetEmojis(c *gin.Context) {
	q := h.db.Model(&model.Emoji{}).Order("id ASC")
	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	limit := 1000
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}
	var emojis []model.Emoji
	if err := q.Limit(limit).Find(&emojis).Error; err != nil {
		ResponseError(c, http.StatusInternalServerError, "Không thể lấy danh sách emoji")
		return
	}
	type row struct {
		ID          uint    `json:"id"`
		Code        string  `json:"code"`
		Name        string  `json:"name"`
		PackID      *uint   `json:"pack_id"`
		AssetURL    string  `json:"asset_url"`
		SourceType  string  `json:"emoji_source_type"`
		SourceValue string  `json:"emoji_source_value"`
		IconText    *string `json:"icon_text"`
		Status      int     `json:"status"`
	}
	out := make([]row, len(emojis))
	for i, e := range emojis {
		out[i] = row{
			ID: e.ID, Code: e.Code, Name: e.Name, PackID: e.PackID,
			AssetURL: e.AssetURL, SourceType: e.SourceType, SourceValue: e.SourceValue,
			IconText: e.IconText, Status: e.Status,
		}
	}
	ResponseSuccess(c, http.StatusOK, "OK", out)
}

// GetEmojiPacks returns all emoji packs.
func (h *MessengerHandler) GetEmojiPacks(c *gin.Context) {
	limit := 1000
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}
	var packs []model.EmojiPack
	if err := h.db.Where("is_active = ?", true).Order("id ASC").Limit(limit).Find(&packs).Error; err != nil {
		ResponseError(c, http.StatusInternalServerError, "Không thể lấy danh sách emoji pack")
		return
	}
	type row struct {
		ID       uint   `json:"id"`
		Code     string `json:"code"`
		Name     string `json:"name"`
		IsActive bool   `json:"is_active"`
	}
	out := make([]row, len(packs))
	for i, p := range packs {
		out[i] = row{ID: p.ID, Code: p.Code, Name: p.Name, IsActive: p.IsActive}
	}
	ResponseSuccess(c, http.StatusOK, "OK", out)
}

// GetStickerPacks returns all sticker packs.
func (h *MessengerHandler) GetStickerPacks(c *gin.Context) {
	limit := 1000
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}
	var packs []model.StickerPack
	if err := h.db.Where("is_active = ?", true).Order("id ASC").Limit(limit).Find(&packs).Error; err != nil {
		ResponseError(c, http.StatusInternalServerError, "Không thể lấy danh sách sticker pack")
		return
	}
	type row struct {
		ID           uint    `json:"id"`
		Name         string  `json:"name"`
		Description  *string `json:"description"`
		ThumbnailURL *string `json:"thumbnail_url"`
		IsActive     bool    `json:"is_active"`
	}
	out := make([]row, len(packs))
	for i, p := range packs {
		out[i] = row{ID: p.ID, Name: p.Name, Description: p.Description, ThumbnailURL: p.ThumbnailURL, IsActive: p.IsActive}
	}
	ResponseSuccess(c, http.StatusOK, "OK", out)
}

// GetStickers returns all stickers, optionally filtered by pack and active status.
func (h *MessengerHandler) GetStickers(c *gin.Context) {
	limit := 1000
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}
	q := h.db.Model(&model.Sticker{}).Order("pack_id ASC, sort_order ASC")
	if isActive := c.Query("is_active"); isActive == "true" {
		q = q.Where("is_active = ?", true)
	}
	var stickers []model.Sticker
	if err := q.Limit(limit).Find(&stickers).Error; err != nil {
		ResponseError(c, http.StatusInternalServerError, "Không thể lấy danh sách sticker")
		return
	}
	type row struct {
		ID        uint   `json:"id"`
		PackID    uint   `json:"pack_id"`
		Name      string `json:"name"`
		ImageURL  string `json:"image_url"`
		SortOrder int    `json:"sort_order"`
		IsActive  bool   `json:"is_active"`
	}
	out := make([]row, len(stickers))
	for i, s := range stickers {
		out[i] = row{ID: s.ID, PackID: s.PackID, Name: s.Name, ImageURL: s.ImageURL, SortOrder: s.SortOrder, IsActive: s.IsActive}
	}
	ResponseSuccess(c, http.StatusOK, "OK", out)
}

// GetThemes returns all themes filtered by status.
func (h *MessengerHandler) GetThemes(c *gin.Context) {
	limit := 1000
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}
	q := h.db.Model(&model.Theme{}).Order("sort_order ASC, id ASC")
	if status := c.Query("status"); status != "" {
		q = q.Where("status = ?", status)
	}
	var themes []model.Theme
	if err := q.Limit(limit).Find(&themes).Error; err != nil {
		ResponseError(c, http.StatusInternalServerError, "Không thể lấy danh sách theme")
		return
	}
	type row struct {
		ID                  uint   `json:"id"`
		PresetID            string `json:"preset_id"`
		Name                string `json:"name"`
		Background          string `json:"background"`
		BackgroundColor     string `json:"background_color"`
		IncomingBubbleColor string `json:"incoming_bubble_color"`
		OutgoingBubbleColor string `json:"outgoing_bubble_color"`
		IncomingTextColor   string `json:"incoming_text_color"`
		OutgoingTextColor   string `json:"outgoing_text_color"`
		Status              string `json:"status"`
		SortOrder           int    `json:"sort_order"`
	}
	out := make([]row, len(themes))
	for i, t := range themes {
		out[i] = row{
			ID: t.ID, PresetID: t.PresetID, Name: t.Name, Background: t.Background,
			BackgroundColor: t.BackgroundColor, IncomingBubbleColor: t.IncomingBubbleColor,
			OutgoingBubbleColor: t.OutgoingBubbleColor, IncomingTextColor: t.IncomingTextColor,
			OutgoingTextColor: t.OutgoingTextColor, Status: t.Status, SortOrder: t.SortOrder,
		}
	}
	ResponseSuccess(c, http.StatusOK, "OK", out)
}

func (h *MessengerHandler) notifyConversationUpdated(c *gin.Context, convID uint, currentUserID uint) {
	participants, err := h.getParticipantsUC.Execute(c.Request.Context(), convID, currentUserID)
	if err != nil {
		return
	}

	wsMsg, err := websocket.NewMessage("conversation.updated", map[string]any{
		"conversation_id": convID,
	})
	if err == nil {
		for _, p := range participants {
			h.hub.BroadcastRoom("messenger:user:"+strconv.FormatUint(uint64(p.ID), 10), wsMsg)
		}
	}
}
