package grpcclient

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/backoff"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
)

func NewConnection(ctx context.Context, service ServiceName, target string, cfg Config, logger *slog.Logger) (*grpc.ClientConn, error) {
	if target == "" {
		return nil, fmt.Errorf("%s target is empty", service)
	}

	conn, err := grpc.NewClient(
		target,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithUnaryInterceptor(UnaryClientInterceptor(logger)),
		grpc.WithKeepaliveParams(keepalive.ClientParameters{
			Time:                cfg.KeepaliveTime,
			Timeout:             cfg.KeepaliveTimeout,
			PermitWithoutStream: true,
		}),
		grpc.WithConnectParams(grpc.ConnectParams{
			Backoff: backoff.Config{
				BaseDelay:  cfg.BackoffBaseDelay,
				Multiplier: cfg.BackoffMultiplier,
				Jitter:     cfg.BackoffJitter,
				MaxDelay:   cfg.BackoffMaxDelay,
			},
			MinConnectTimeout: cfg.ConnectTimeout,
		}),
		grpc.WithDefaultServiceConfig(defaultServiceConfig(cfg)),
	)
	if err != nil {
		return nil, fmt.Errorf("create %s gRPC client: %w", service, err)
	}

	if err := waitUntilReady(ctx, conn); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("connect %s at %s: %w", service, target, err)
	}

	return conn, nil
}

func waitUntilReady(ctx context.Context, conn *grpc.ClientConn) error {
	conn.Connect()
	for {
		state := conn.GetState()
		switch state {
		case connectivity.Ready:
			return nil
		case connectivity.Shutdown:
			return fmt.Errorf("connection shutdown")
		}

		if !conn.WaitForStateChange(ctx, state) {
			return ctx.Err()
		}
	}
}

func defaultServiceConfig(cfg Config) string {
	if cfg.MaxRetryAttempts <= 1 {
		return `{"loadBalancingPolicy":"round_robin"}`
	}

	return fmt.Sprintf(`{
		"loadBalancingPolicy":"round_robin",
		"methodConfig":[{
			"name":[{}],
			"retryPolicy":{
				"maxAttempts":%d,
				"initialBackoff":"%s",
				"maxBackoff":"%s",
				"backoffMultiplier":%.2f,
				"retryableStatusCodes":["UNAVAILABLE","RESOURCE_EXHAUSTED","DEADLINE_EXCEEDED"]
			}
		}]
	}`, cfg.MaxRetryAttempts, durationString(200*time.Millisecond), durationString(cfg.BackoffMaxDelay), cfg.BackoffMultiplier)
}

func durationString(duration time.Duration) string {
	return fmt.Sprintf("%.3fs", duration.Seconds())
}
