package db

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/tumlumtala/musics-service/internal/config"
)

type vnWriter struct {
	w  io.Writer
	tz *time.Location
}

func newVNWriter(w io.Writer) io.Writer {
	loc, err := time.LoadLocation("Asia/Ho_Chi_Minh")
	if err != nil {
		loc = time.FixedZone("UTC+7", 7*60*60)
	}
	return &vnWriter{w: w, tz: loc}
}

func (vw *vnWriter) Write(p []byte) (int, error) {
	ts := time.Now().In(vw.tz).Format("2006/01/02 15:04:05")
	fmt.Fprintf(vw.w, "%s ", ts)
	return vw.w.Write(p)
}

func OpenMySQL(ctx context.Context, cfg config.DatabaseConfig) (*gorm.DB, error) {
	gormLogger := logger.New(
		log.New(newVNWriter(os.Stdout), "\r\n", 0),
		logger.Config{
			SlowThreshold:             200 * time.Millisecond,
			LogLevel:                  logger.Info,
			IgnoreRecordNotFoundError: true,
			Colorful:                  false,
		},
	)
	db, err := gorm.Open(mysql.Open(cfg.DSN()), &gorm.Config{Logger: gormLogger})
	if err != nil {
		return nil, err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)
	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(pingCtx); err != nil {
		_ = sqlDB.Close()
		return nil, err
	}
	return db, nil
}
