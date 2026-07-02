package main

import (
	"context"
	"log"
	"log/slog"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	httphandler "github.com/tumlumtala/musics-service/internal/adapter/http"
	"github.com/tumlumtala/musics-service/internal/config"
	database "github.com/tumlumtala/musics-service/internal/infrastructure/db"
	kafkainfra "github.com/tumlumtala/musics-service/internal/infrastructure/kafka"
	"github.com/tumlumtala/musics-service/internal/infrastructure/spotify"
	"github.com/tumlumtala/musics-service/internal/infrastructure/youtube"
	historyquery "github.com/tumlumtala/musics-service/internal/module/application/query/history"
	libraryquery "github.com/tumlumtala/musics-service/internal/module/application/query/library"
	likedquery "github.com/tumlumtala/musics-service/internal/module/application/query/liked"
	listeningquery "github.com/tumlumtala/musics-service/internal/module/application/query/listening"
	playlistquery "github.com/tumlumtala/musics-service/internal/module/application/query/playlist"
	searchquery "github.com/tumlumtala/musics-service/internal/module/application/query/search"
	historyuc "github.com/tumlumtala/musics-service/internal/module/application/usecase/history"
	intelligenceuc "github.com/tumlumtala/musics-service/internal/module/application/usecase/intelligence"
	libraryuc "github.com/tumlumtala/musics-service/internal/module/application/usecase/library"
	likeduc "github.com/tumlumtala/musics-service/internal/module/application/usecase/liked"
	listeninguc "github.com/tumlumtala/musics-service/internal/module/application/usecase/listening"
	playlistuc "github.com/tumlumtala/musics-service/internal/module/application/usecase/playlist"
	searchuc "github.com/tumlumtala/musics-service/internal/module/application/usecase/search"
	"github.com/tumlumtala/musics-service/internal/module/infrastructure/persistence/repository"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	db, err := database.OpenMySQL(ctx, cfg.DB)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()

	// Start Kafka consumer to keep user_snapshots in sync.
	userSnapshotConsumer := kafkainfra.NewUserSnapshotConsumer(db, cfg.KafkaBrokers, slog.Default())
	go userSnapshotConsumer.Run(ctx)

	repo := repository.NewRepository(db)
	intelligenceService := intelligenceuc.NewService(
		repo,
		intelligenceuc.NewCompatiblePlanner(cfg.MusicAI.Endpoint, cfg.MusicAI.APIKey, cfg.MusicAI.Model),
	)

	handler := httphandler.NewHandler(
		likedquery.NewQueryService(repo),
		likeduc.NewUseCase(repo),
		historyquery.NewQueryService(repo),
		historyuc.NewUseCase(repo),
		searchquery.NewQueryService(repo),
		searchuc.NewUseCase(repo),
		playlistquery.NewQueryService(repo),
		playlistuc.NewUseCase(repo),
		libraryquery.NewQueryService(repo),
		libraryuc.NewUseCase(repo),
		listeningquery.NewQueryService(repo),
		listeninguc.NewUseCase(repo),
		intelligenceService,
		spotify.NewClient(spotify.Config{
			ClientID:     cfg.Spotify.ClientID,
			ClientSecret: cfg.Spotify.ClientSecret,
			Market:       cfg.Spotify.Market,
		}),
		youtube.NewService(repo, youtube.Config{
			APIKey:   cfg.YouTube.APIKey,
			CacheTTL: cfg.YouTube.CacheTTL,
		}),
	)

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	httphandler.RegisterRoutes(r, handler, cfg.JWTSecret)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	go func() {
		log.Printf("musics-service listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
	log.Println("musics-service stopped")
}
