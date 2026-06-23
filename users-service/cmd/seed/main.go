package main

import (
	"context"
	"flag"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/tumlumtala/users-service/internal/application/usecase"
	"github.com/tumlumtala/users-service/internal/config"
	database "github.com/tumlumtala/users-service/internal/infrastructure/db"
	"github.com/tumlumtala/users-service/internal/infrastructure/db/seeders"
	kafkainfra "github.com/tumlumtala/users-service/internal/infrastructure/kafka"
	mysqlquery "github.com/tumlumtala/users-service/internal/infrastructure/persistence/queryservice"
	mysqlrepo "github.com/tumlumtala/users-service/internal/infrastructure/persistence/repository"
	domainrepo "github.com/tumlumtala/users-service/internal/domain/repository"
)

func main() {
	log.SetFlags(0)
	log.SetOutput(database.NewVNWriter(os.Stdout))

	only := flag.String("only", "", "Run only specific seeders (comma-separated)")
	flag.Parse()

	var onlyList []string
	if *only != "" {
		for _, s := range strings.Split(*only, ",") {
			if t := strings.TrimSpace(s); t != "" {
				onlyList = append(onlyList, t)
			}
		}
	}

	// Resolve project root so seeders can locate seed-assets regardless of cwd.
	// SEED_ROOT env var overrides; fallback to the current working directory.
	if root := os.Getenv("SEED_ROOT"); root != "" {
		seeders.RootDir = root
	} else {
		cwd, err := os.Getwd()
		if err != nil {
			log.Fatal(err)
		}
		seeders.RootDir = filepath.Clean(cwd)
	}

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

	// Use real EventPublisher so user.created / user.updated events are published
	// to Kafka during seeding — consumer services (messenger, movies, …) will
	// automatically sync their user_snapshots tables.
	//
	// Set SEED_NOOP_KAFKA=1 to skip Kafka publishing (e.g. running seed without infra).
	var publisher domainrepo.EventPublisher
	if os.Getenv("SEED_NOOP_KAFKA") == "1" {
		log.Println("[seed] SEED_NOOP_KAFKA=1 — skipping Kafka event publishing")
		publisher = kafkainfra.NoopPublisher{}
	} else {
		pub := kafkainfra.NewEventPublisher(cfg.KafkaBrokers)
		defer func() { _ = pub.Close() }()
		publisher = pub
	}

	// Khai báo danh sách và thứ tự seeder sẽ được chạy.
	// Thêm hoặc bỏ seeder tại đây để kiểm soát seeder nào được phép chạy.
	all := []seeders.Seeder{
		seeders.NewUserSeeder(
			usecase.NewCreateUserUseCase(repository, queries, publisher),
			usecase.NewUpdateUserUseCase(repository, queries, publisher),
			queries,
		),
	}

	if err := seeders.Run(ctx, onlyList, all); err != nil {
		log.Fatal(err)
	}
}
