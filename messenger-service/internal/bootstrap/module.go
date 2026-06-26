package bootstrap

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	httpAdapter "github.com/tumlumtala/messenger-service/internal/adapter/http"
	wsAdapter "github.com/tumlumtala/messenger-service/internal/adapter/websocket"
	conversationUC "github.com/tumlumtala/messenger-service/internal/application/usecase/conversation"
	historyUC "github.com/tumlumtala/messenger-service/internal/application/usecase/history"
	messageUC "github.com/tumlumtala/messenger-service/internal/application/usecase/message"
	"github.com/tumlumtala/messenger-service/internal/config"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/presence"
	ws "github.com/tumlumtala/messenger-service/internal/infrastructure/websocket"
	persistenceQS "github.com/tumlumtala/messenger-service/internal/infrastructure/persistence/queryservice"
	persistenceRepo "github.com/tumlumtala/messenger-service/internal/infrastructure/persistence/repository"
	"gorm.io/gorm"
)

// bunnyCDNUploader implements conversationUC.MessengerAssetUploader via BunnyCDN Storage API.
type bunnyCDNUploader struct {
	apiKey      string
	storageZone string
	baseURL     string
	client      *http.Client
}

func newBunnyCDNUploader(cfg config.Config) *bunnyCDNUploader {
	return &bunnyCDNUploader{
		apiKey:      cfg.BunnyCDN.APIKey,
		storageZone: cfg.BunnyCDN.StorageZone,
		baseURL:     cfg.BunnyCDN.CDNBaseURL,
		client:      &http.Client{},
	}
}

func (b *bunnyCDNUploader) Upload(ctx context.Context, remotePath string, payload []byte, contentType string) (string, error) {
	url := fmt.Sprintf("https://storage.bunnycdn.com/%s/%s", b.storageZone, remotePath)
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, url, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("AccessKey", b.apiKey)
	req.Header.Set("Content-Type", contentType)
	resp, err := b.client.Do(req)
	if err != nil {
		return "", err
	}
	defer func() { _, _ = io.ReadAll(resp.Body); _ = resp.Body.Close() }()
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("bunnyCDN upload failed: status %d", resp.StatusCode)
	}
	return b.baseURL + "/" + remotePath, nil
}

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

	// Media upload (nil when BunnyCDN not configured — gracefully degraded)
	var mediaUploadService *conversationUC.MediaUploadService
	if cfg.BunnyCDN.APIKey != "" && cfg.BunnyCDN.StorageZone != "" {
		bunny := newBunnyCDNUploader(cfg)
		mediaUploadService = conversationUC.NewMediaUploadService(bunny)
	}

	// WebSocket
	hub := ws.NewHub()
	pool := ws.NewConnectionPool()
	go hub.Run()

	// Presence
	rdb := newRedisClient(cfg)
	presenceStore := presence.NewStore(rdb)

	// WebSocket handler
	wsHandler := wsAdapter.NewHandler(conversationRepo, sendMessage, markRead, getConversations, getMessages, hub, presenceStore)

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
	routes.Register(v1)
	routes.RegisterInfra(engine)
}
