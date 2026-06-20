package main

import (
	"context"
	"log"
	"net"
	"os/signal"
	"syscall"

	bootstrap "github.com/tumlumtala/users-service/internal/bootstrap"
	"github.com/tumlumtala/users-service/internal/config"
	"github.com/tumlumtala/users-service/internal/infrastructure/database"
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
		log.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal(err)
	}
	defer func() { _ = sqlDB.Close() }()
	lis, err := net.Listen("tcp", ":"+cfg.Port)
	if err != nil {
		log.Fatal(err)
	}
	server := grpc.NewServer()
	bootstrap.Register(server, db)
	go func() { <-ctx.Done(); server.GracefulStop() }()
	log.Printf("users-service listening on %s", lis.Addr())
	if err := server.Serve(lis); err != nil {
		log.Fatal(err)
	}
}
