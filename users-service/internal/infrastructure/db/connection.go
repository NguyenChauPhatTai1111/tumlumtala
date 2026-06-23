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
	gormtracing "gorm.io/plugin/opentelemetry/tracing"
)

// vnWriter wraps an io.Writer and prefixes each message with the current time in Asia/Ho_Chi_Minh.
type vnWriter struct {
	w  io.Writer
	tz *time.Location
}

func NewVNWriter(w io.Writer) io.Writer {
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

func OpenMySQL(ctx context.Context, dsn string) (*gorm.DB, error) {
	gormLogger := logger.New(
		log.New(NewVNWriter(os.Stdout), "\r\n", 0),
		logger.Config{
			SlowThreshold:             200 * time.Millisecond,
			LogLevel:                  logger.Info,
			IgnoreRecordNotFoundError: true,
			Colorful:                  false,
		},
	)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		return nil, err
	}
	if err := db.Use(gormtracing.NewPlugin(
		gormtracing.WithDBSystem("mysql"),
		gormtracing.WithoutMetrics(),
		gormtracing.WithoutQueryVariables(),
	)); err != nil {
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
