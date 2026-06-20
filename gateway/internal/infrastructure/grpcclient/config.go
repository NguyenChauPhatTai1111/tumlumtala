package grpcclient

import (
	"time"

	"github.com/tumlumtala/gateway/internal/config"
)

type ServiceName string

const (
	AuthService          ServiceName = "AuthService"
	AuthorizationService ServiceName = "AuthorizationService"
	UserService          ServiceName = "UserService"
	CourseService        ServiceName = "CourseService"
	OrderService         ServiceName = "OrderService"
)

type ServiceConfig struct {
	Target  string
	Enabled bool
}

type Config struct {
	Auth          ServiceConfig
	Authorization ServiceConfig
	User          ServiceConfig
	Course        ServiceConfig
	Order         ServiceConfig

	ConnectTimeout    time.Duration
	KeepaliveTime     time.Duration
	KeepaliveTimeout  time.Duration
	BackoffBaseDelay  time.Duration
	BackoffMultiplier float64
	BackoffJitter     float64
	BackoffMaxDelay   time.Duration
	MaxRetryAttempts  int
}

func FromAppConfig(cfg config.Config) Config {
	return Config{
		Auth:          ServiceConfig{Target: cfg.AuthServiceAddr, Enabled: true},
		Authorization: ServiceConfig{Target: cfg.AuthorizationServiceAddr, Enabled: true},
		User:          ServiceConfig{Target: cfg.UserServiceAddr, Enabled: true},
		Course:        ServiceConfig{Target: cfg.CourseServiceAddr, Enabled: false},
		Order:         ServiceConfig{Target: cfg.OrderServiceAddr, Enabled: false},

		ConnectTimeout:    5 * time.Second,
		KeepaliveTime:     30 * time.Second,
		KeepaliveTimeout:  10 * time.Second,
		BackoffBaseDelay:  100 * time.Millisecond,
		BackoffMultiplier: 1.6,
		BackoffJitter:     0.2,
		BackoffMaxDelay:   5 * time.Second,
		MaxRetryAttempts:  3,
	}
}
