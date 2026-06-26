package bootstrap

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

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
	ws "github.com/tumlumtala/messenger-service/internal/infrastructure/websocket"
	"gorm.io/gorm"
)

// bunnyCDNUploader implements conversationUC.MessengerAssetUploader via BunnyCDN Storage API.
type bunnyCDNUploader struct {
	apiKey      string
	storageZone string
	baseURL     string
	client      *http.Client
}

type localUploader struct {
	rootDir string
	baseURL string
}

func newLocalUploader(cfg config.Config) *localUploader {
	rootDir := strings.TrimSpace(cfg.LocalUpload.Dir)
	if rootDir == "" {
		return nil
	}
	return &localUploader{
		rootDir: rootDir,
		baseURL: strings.TrimRight(strings.TrimSpace(cfg.LocalUpload.BaseURL), "/"),
	}
}

func (u *localUploader) Upload(_ context.Context, remotePath string, payload []byte, _ string) (string, error) {
	if u == nil || strings.TrimSpace(u.rootDir) == "" {
		return "", fmt.Errorf("local upload dir is not configured")
	}
	cleanRemotePath := strings.TrimLeft(filepath.Clean(remotePath), string(filepath.Separator))
	if cleanRemotePath == "." || strings.HasPrefix(cleanRemotePath, "..") {
		return "", fmt.Errorf("invalid upload path")
	}
	targetPath := filepath.Join(u.rootDir, cleanRemotePath)
	if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
		return "", err
	}
	if err := os.WriteFile(targetPath, payload, 0o644); err != nil {
		return "", err
	}
	if u.baseURL != "" {
		return u.baseURL + "/" + strings.ReplaceAll(cleanRemotePath, string(filepath.Separator), "/"), nil
	}
	return strings.ReplaceAll(cleanRemotePath, string(filepath.Separator), "/"), nil
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

	// Media upload: BunnyCDN in production, local filesystem in development.
	var mediaUploadService *conversationUC.MediaUploadService
	if cfg.BunnyCDN.APIKey != "" && cfg.BunnyCDN.StorageZone != "" {
		bunny := newBunnyCDNUploader(cfg)
		mediaUploadService = conversationUC.NewMediaUploadService(bunny)
	} else if local := newLocalUploader(cfg); local != nil {
		mediaUploadService = conversationUC.NewMediaUploadService(local)
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
	routes.Register(v1)
	routes.RegisterInfra(engine)
	if cfg.LocalUpload.Dir != "" && cfg.LocalUpload.BaseURL != "" {
		engine.Static(cfg.LocalUpload.BaseURL, cfg.LocalUpload.Dir)
	}
}
