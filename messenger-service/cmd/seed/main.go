package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/joho/godotenv"

	"github.com/tumlumtala/messenger-service/internal/config"
	database "github.com/tumlumtala/messenger-service/internal/infrastructure/db"
	"github.com/tumlumtala/messenger-service/internal/infrastructure/db/seeders"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	db, err := database.OpenMySQL(context.Background(), cfg.Database.DSN())
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()

	only := flag.String("only", "", "Run only specific seeders (comma-separated)")
	skip := flag.String("skip", "", "Skip specific seeders (comma-separated)")
	flag.Parse()

	var onlyList, skipList []string
	if *only != "" {
		for _, s := range strings.Split(*only, ",") {
			if t := strings.TrimSpace(s); t != "" {
				onlyList = append(onlyList, t)
			}
		}
	}
	if *skip != "" {
		for _, s := range strings.Split(*skip, ",") {
			if t := strings.TrimSpace(s); t != "" {
				skipList = append(skipList, t)
			}
		}
	}

	fmt.Printf("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
	fmt.Printf("  messenger-service seeder  [%s]\n", time.Now().Format("2006-01-02 15:04:05"))
	fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n")

	start := time.Now()
	if err := seeders.Run(db, onlyList, skipList); err != nil {
		fmt.Printf("\n✗  seeding failed: %v\n", err)
		log.Fatalf("seeding failed: %v", err)
	}

	fmt.Printf("   total time: %s\n", time.Since(start).Round(time.Millisecond))
	fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n")
}
