package main

import (
	"context"
	"log"
	"net"
	"os/signal"
	"syscall"

	"github.com/tumlumtala/authorization-service/internal/bootstrap"
	"github.com/tumlumtala/authorization-service/internal/config"
	database "github.com/tumlumtala/authorization-service/internal/infrastructure/db"
	redisinfra "github.com/tumlumtala/authorization-service/internal/infrastructure/redis"
	"google.golang.org/grpc"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	db, err := database.OpenMySQL(ctx, cfg.Database.DSN())
	if err != nil {
		log.Fatal("mysql:", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal(err)
	}
	defer func() { _ = sqlDB.Close() }()

	redisClient, err := redisinfra.NewClient(cfg.Redis.Addr(), cfg.Redis.Password, cfg.Redis.DB)
	if err != nil {
		log.Fatal("redis:", err)
	}
	defer func() { _ = redisClient.Close() }()

	lis, err := net.Listen("tcp", ":"+cfg.Port)
	if err != nil {
		log.Fatal(err)
	}

	server := grpc.NewServer()
	bootstrap.Register(server, db, redisClient)

	go func() { <-ctx.Done(); server.GracefulStop() }()
	log.Printf("authorization-service listening on %s", lis.Addr())
	if err := server.Serve(lis); err != nil {
		log.Fatal(err)
	}
}
