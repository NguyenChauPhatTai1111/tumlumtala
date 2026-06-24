// cmd/replay publishes a user.upserted event for every user in the database.
//
// Use this to sync user_snapshots across all consumer services after a fresh
// seed, or whenever you need to force a full re-sync.
//
// Prerequisites (run once before replay if databases are empty):
//
//	make migrate-all   # creates tables in all services
//
// Then:
//
//	make replay        # publishes user.upserted events; consumers do the rest
//
// user.upserted is idempotent: consumers handle it with INSERT … ON DUPLICATE
// KEY UPDATE, so replaying multiple times is safe.
//
// Flags:
//
//	--dry-run   print users without publishing
//	--no-wait   exit after publishing, skip polling consumer DBs
//
// Environment variables (optional):
//
//	KAFKA_BROKERS        comma-separated brokers  (default: tumlumtala-kafka:9092)
//	REPLAY_TIMEOUT       seconds to poll          (default: 120)
//	REPLAY_POLL_INTERVAL seconds between polls    (default: 2)
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/gorm"

	"github.com/tumlumtala/contracts/events"
	"github.com/tumlumtala/users-service/internal/config"
	database "github.com/tumlumtala/users-service/internal/infrastructure/db"
	kafkainfra "github.com/tumlumtala/users-service/internal/infrastructure/kafka"
	mysqlquery "github.com/tumlumtala/users-service/internal/infrastructure/persistence/queryservice"
)

const batchSize = 100

// watchedDB is a consumer database whose user_snapshots table is polled after
// replay to confirm events were processed. Add new services here.
type watchedDB struct {
	name   string
	dbName string
}

var watchedDBs = []watchedDB{
	{name: "messenger-service", dbName: "tumlumtala_messenger"},
	{name: "movies-service", dbName: "tumlumtala_movies"},
}

func main() {
	log.SetFlags(0)
	log.SetOutput(database.NewVNWriter(os.Stdout))

	dryRun := flag.Bool("dry-run", false, "Print users without publishing")
	noWait := flag.Bool("no-wait", false, "Exit after publishing, skip polling")
	flag.Parse()

	_ = godotenv.Load()

	ctx := context.Background()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	userDB, err := database.OpenMySQL(ctx, cfg.Database.DSN())
	if err != nil {
		log.Fatalf("open users DB: %v", err)
	}
	sqlDB, _ := userDB.DB()
	defer func() { _ = sqlDB.Close() }()

	queries := mysqlquery.NewMySQLUserQueryService(userDB)

	total, err := queries.Count(ctx, "")
	if err != nil {
		log.Fatalf("count users: %v", err)
	}
	log.Printf("→ %d users to replay", total)

	if *dryRun {
		log.Println("dry-run — no events published")
		return
	}
	if total == 0 {
		log.Println("no users found, nothing to replay")
		return
	}

	// ── publish user.upserted events ────────────────────────────────────────
	publisher := kafkainfra.NewEventPublisher(cfg.KafkaBrokers)
	defer func() { _ = publisher.Close() }()

	published := 0
	var offset int32
	for {
		users, err := queries.List(ctx, batchSize, offset, "")
		if err != nil {
			log.Fatalf("list users offset=%d: %v", offset, err)
		}
		if len(users) == 0 {
			break
		}
		for _, u := range users {
			ev := events.UserUpsertedEvent{
				ID:       u.ID,
				UUID:     u.UUID,
				Email:    u.Email,
				Fullname: u.Fullname,
				Avatar:   u.Avatar,
				Role:     string(u.Role),
			}
			if err := publisher.PublishUserUpserted(ctx, u.UUID, ev); err != nil {
				log.Fatalf("publish user.upserted id=%d: %v", u.ID, err)
			}
			published++
			log.Printf("  → user.upserted id=%d email=%q", u.ID, u.Email)
		}
		offset += int32(len(users))
		if int32(len(users)) < batchSize {
			break
		}
		time.Sleep(50 * time.Millisecond)
	}
	log.Printf("✅ published %d user.upserted events", published)

	if *noWait {
		return
	}

	// ── poll consumer DBs until user_snapshots is fully synced ──────────────
	timeout := time.Duration(envInt("REPLAY_TIMEOUT", 120)) * time.Second
	pollInterval := time.Duration(envInt("REPLAY_POLL_INTERVAL", 2)) * time.Second
	log.Printf("→ polling consumer DBs (timeout %s) — run with --no-wait to skip", timeout)

	type target struct {
		w    watchedDB
		db   *gorm.DB
		done bool
	}
	targets := make([]target, len(watchedDBs))
	for i, w := range watchedDBs {
		conn, err := database.OpenMySQL(ctx, buildDSN(cfg, w.dbName))
		if err != nil {
			log.Printf("  [%s] cannot connect for polling: %v — skipping", w.name, err)
			targets[i] = target{w: w, done: true}
			continue
		}
		s, _ := conn.DB()
		defer func() { _ = s.Close() }()
		targets[i] = target{w: w, db: conn}
	}

	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		allDone := true
		for i := range targets {
			t := &targets[i]
			if t.done {
				continue
			}
			var count int64
			if err := t.db.Table("user_snapshots").Count(&count).Error; err != nil {
				log.Printf("  [%s] poll error: %v", t.w.name, err)
				allDone = false
				continue
			}
			log.Printf("  [%s] user_snapshots %d / %d", t.w.name, count, total)
			if count >= total {
				log.Printf("  ✅ [%s] synced", t.w.name)
				t.done = true
			} else {
				allDone = false
			}
		}
		if allDone {
			log.Println("✅ all consumer databases synced")
			return
		}
		time.Sleep(pollInterval)
	}

	log.Println("⚠️  poll timeout — some services did not confirm sync yet:")
	for _, t := range targets {
		if !t.done {
			var count int64
			if t.db != nil {
				_ = t.db.Table("user_snapshots").Count(&count).Error
			}
			log.Printf("  [%s] %d / %d rows — events are in Kafka, consumer will sync when it starts", t.w.name, count, total)
		}
	}
	log.Println("✅ events published — consumers will catch up when they start")
}

func buildDSN(cfg config.Config, dbName string) string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.Database.User, cfg.Database.Password,
		cfg.Database.Host, cfg.Database.Port,
		dbName,
	)
}

func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}
