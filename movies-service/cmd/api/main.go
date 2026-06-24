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

	httphandler "github.com/tumlumtala/movies-service/internal/adapter/http"
	"github.com/tumlumtala/movies-service/internal/config"
	database "github.com/tumlumtala/movies-service/internal/infrastructure/db"
	kafkainfra "github.com/tumlumtala/movies-service/internal/infrastructure/kafka"
	certuc "github.com/tumlumtala/movies-service/internal/module/application/usecase/certification"
	likeduc "github.com/tumlumtala/movies-service/internal/module/application/usecase/liked"
	searchuc "github.com/tumlumtala/movies-service/internal/module/application/usecase/search"
	seasonuc "github.com/tumlumtala/movies-service/internal/module/application/usecase/season"
	watchuc "github.com/tumlumtala/movies-service/internal/module/application/usecase/watch"
	"github.com/tumlumtala/movies-service/internal/module/infrastructure/persistence/repository"
	"github.com/tumlumtala/movies-service/internal/module/infrastructure/tmdb"
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
	tmdbClient := tmdb.NewClient(cfg.TMDBAPIKey)

	certFetch := certuc.NewBatchUseCase(repo, tmdbClient)

	handler := httphandler.NewHandler(
		watchuc.NewWatchHistoryQueryUseCase(repo),
		watchuc.NewWatchHistoryUseCase(repo),
		searchuc.NewSearchHistoryQueryUseCase(repo),
		searchuc.NewSearchHistoryUseCase(repo),
		likeduc.NewLikedMovieQueryUseCase(repo),
		likeduc.NewLikedMovieUseCase(repo),
		certuc.NewCertificationQueryUseCase(repo, certFetch),
		seasonuc.NewSeasonQueryUseCase(repo),
		seasonuc.NewSeasonUseCase(repo),
	)

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	httphandler.RegisterRoutes(r, handler, cfg.JWTSecret)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	go func() {
		log.Printf("movies-service listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
	log.Println("movies-service stopped")
}
