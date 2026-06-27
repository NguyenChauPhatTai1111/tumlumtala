package bootstrap

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	httpAdapter "github.com/tumlumtala/messenger-service/internal/adapter/http"
	wsAdapter "github.com/tumlumtala/messenger-service/internal/adapter/websocket"
	activityUC "github.com/tumlumtala/messenger-service/internal/application/usecase/activity"
	conversationUC "github.com/tumlumtala/messenger-service/internal/application/usecase/conversation"
	historyUC "github.com/tumlumtala/messenger-service/internal/application/usecase/history"
	messageUC "github.com/tumlumtala/messenger-service/internal/application/usecase/message"
	"github.com/tumlumtala/messenger-service/internal/config"
	notificationClient "github.com/tumlumtala/messenger-service/internal/infrastructure/notification"
	persistenceQS "github.com/tumlumtala/messenger-service/internal/infrastructure/persistence/queryservice"
	persistenceRepo "github.com/tumlumtala/messenger-service/internal/infrastructure/persistence/repository"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/presence"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/storage"
	ws "github.com/tumlumtala/messenger-service/internal/infrastructure/websocket"
	"gorm.io/gorm"
)

func newRedisClient(cfg config.Config) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Host + ":" + cfg.Redis.Port,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})
}

func Register(engine *gin.Engine, db *gorm.DB, cfg config.Config) {
	// Repositories
	conversationRepo := persistenceRepo.NewUserConversationRepository(db)
	messageRepo := persistenceRepo.NewUserMessageRepository(db)
	historyRepo := persistenceRepo.NewMessageHistoryRepository(db)
	activityRepo := persistenceRepo.NewUserConversationActivityRepository(db)
	callRepo := persistenceRepo.NewCallSessionRepository(db)

	// Query Services
	conversationQS := persistenceQS.NewUserConversationQueryService(conversationRepo, messageRepo)
	messageQS := persistenceQS.NewUserMessageQueryService(messageRepo, conversationRepo)
	activityQS := persistenceQS.NewUserConversationActivityQueryService(activityRepo, conversationQS)
	userQS := persistenceQS.NewMySQLUserQueryService(db)

	// Conversation use cases
	createConversation := conversationUC.NewCreateConversationUseCase(conversationRepo, activityRepo, userQS)
	getConversations := conversationUC.NewGetUserConversationsUseCase(conversationQS)
	renameConversation := conversationUC.NewRenameConversationUseCase(conversationRepo, conversationQS)
	addMembers := conversationUC.NewAddMembersUseCase(conversationQS, conversationRepo, userQS, activityRepo)
	removeMember := conversationUC.NewRemoveMemberUseCase(conversationRepo, conversationQS, userQS, activityRepo)
	changeBackground := conversationUC.NewChangeBackgroundUseCase(conversationRepo, conversationQS, userQS, activityRepo)
	toggleNotifications := conversationUC.NewToggleNotificationsUseCase(conversationRepo, conversationQS)
	getParticipants := conversationUC.NewGetParticipantsUseCase(conversationRepo)
	setNickname := conversationUC.NewSetNicknameUseCase(conversationRepo, conversationQS, userQS, activityRepo)
	setQuickReaction := conversationUC.NewSetQuickReactionUseCase(conversationRepo, conversationQS, userQS, activityRepo)
	changeAvatar := conversationUC.NewChangeAvatarUseCase(conversationRepo, conversationQS, userQS, activityRepo)
	leaveGroup := conversationUC.NewLeaveGroupUseCase(conversationRepo, conversationQS, activityRepo, userQS)
	archiveConversation := conversationUC.NewArchiveConversationUseCase(conversationRepo, conversationQS)
	restoreConversation := conversationUC.NewRestoreConversationUseCase(conversationRepo, conversationQS)
	deleteConversation := conversationUC.NewDeleteConversationUseCase(conversationRepo, conversationQS)

	// Message use cases
	sendMessage := messageUC.NewSendMessageUseCase(messageRepo, conversationQS, messageQS, conversationRepo)
	getMessages := messageUC.NewGetMessagesByConversationUseCase(messageQS, conversationQS, activityQS)
	searchMessages := messageUC.NewSearchMessagesUseCase(messageQS, conversationQS)
	searchAllMessages := messageUC.NewSearchAllMessagesUseCase(messageQS)
	markRead := messageUC.NewMarkReadUseCase(conversationQS, conversationRepo)
	updateMessage := messageUC.NewUpdateMessageUseCase(messageRepo, conversationRepo, historyRepo, messageQS)
	deleteMessage := messageUC.NewDeleteMessageUseCase(messageRepo, messageQS)
	setReaction := messageUC.NewSetReactionUseCase(messageQS, messageRepo, conversationQS, conversationRepo)
	removeReaction := messageUC.NewRemoveReactionUseCase(messageRepo, conversationQS, messageQS)

	// History use case
	getMessageHistory := historyUC.NewGetMessageHistoryUseCase(historyRepo)

	// Media upload: local filesystem.
	var mediaUploadService *conversationUC.MediaUploadService
	localUploader, err := storage.NewLocalUploader(cfg.LocalUpload.Dir, cfg.LocalUpload.BaseURL)
	if err == nil {
		mediaUploadService = conversationUC.NewMediaUploadService(localUploader)
	} else {
		fmt.Printf("messenger local uploader disabled: %v\n", err)
	}

	// WebSocket
	hub := ws.NewHub()
	pool := ws.NewConnectionPool()
	go hub.Run()

	// Activity use case (used by WebSocket handler for call history)
	createActivity := activityUC.NewCreateActivityUseCase(activityRepo)

	// Presence
	rdb := newRedisClient(cfg)
	presenceStore := presence.NewStore(rdb)

	// Notification client is optional. When configured, incoming calls are also
	// sent to notification-service so offline receivers can be reached.
	callNotifier, err := notificationClient.NewClient(cfg.Notification)
	if err != nil {
		fmt.Printf("[notification] init client failed: %v\n", err)
	}

	// WebSocket handler
	wsHandler := wsAdapter.NewHandler(conversationRepo, callRepo, createActivity, sendMessage, markRead, getConversations, getMessages, hub, presenceStore, callNotifier)

	// HTTP handler
	handler := httpAdapter.NewMessengerHandler(
		db,
		createConversation,
		getConversations,
		renameConversation,
		addMembers,
		removeMember,
		changeBackground,
		toggleNotifications,
		getParticipants,
		setNickname,
		setQuickReaction,
		changeAvatar,
		leaveGroup,
		archiveConversation,
		restoreConversation,
		deleteConversation,
		sendMessage,
		getMessages,
		searchMessages,
		searchAllMessages,
		markRead,
		updateMessage,
		deleteMessage,
		setReaction,
		removeReaction,
		getMessageHistory,
		mediaUploadService,
		wsHandler,
		hub,
	)

	// Routes
	routes := httpAdapter.NewMessengerRoutes(handler, wsHandler, pool, hub, db, cfg.JWTSecret)

	v1 := engine.Group("/api/v1")
	if cfg.LocalUpload.Dir != "" && cfg.LocalUpload.BaseURL != "" {
		engine.Static(cfg.LocalUpload.BaseURL, cfg.LocalUpload.Dir)
	}
	routes.Register(v1)
	routes.RegisterInfra(engine)
}
