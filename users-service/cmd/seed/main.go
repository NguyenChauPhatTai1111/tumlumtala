package main

import (
	"context"
	"log"

	"github.com/tumlumtala/users-service/internal/application/usecase"
	"github.com/tumlumtala/users-service/internal/config"
	database "github.com/tumlumtala/users-service/internal/infrastructure/db"
	"github.com/tumlumtala/users-service/internal/infrastructure/db/seeders"
	kafkainfra "github.com/tumlumtala/users-service/internal/infrastructure/kafka"
	mysqlquery "github.com/tumlumtala/users-service/internal/infrastructure/persistence/queryservice"
	mysqlrepo "github.com/tumlumtala/users-service/internal/infrastructure/persistence/repository"
)

func main() {
	ctx := context.Background()
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

	repository := mysqlrepo.NewMySQLUserRepository(db)
	queries := mysqlquery.NewMySQLUserQueryService(db)
	noop := kafkainfra.NoopPublisher{}
	userSeeder := seeders.NewUserSeeder(
		usecase.NewCreateUserUseCase(repository, queries, noop),
		usecase.NewUpdateUserUseCase(repository, queries, noop),
		queries,
	)
	if err := seeders.Run(ctx, userSeeder); err != nil {
		log.Fatal(err)
	}
}
