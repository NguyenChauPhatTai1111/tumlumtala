package grpcmiddleware

import (
	"context"
	"time"

	"github.com/rs/zerolog"
	"github.com/tumlumtala/users-service/internal/shared/logger"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

func UnaryServerLogging(base zerolog.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		startedAt := time.Now()
		requestID := requestIDFromMetadata(ctx)
		ctx = logger.WithRequestFields(ctx, base, requestID)

		resp, err := handler(ctx, req)
		latency := time.Since(startedAt)
		code := status.Code(err)

		log := logger.FromContext(ctx, base)
		event := log.Info()
		if err != nil {
			event = log.Error().Err(err)
		}

		event.
			Str("component", "grpc_server").
			Str("method", info.FullMethod).
			Str("grpc_code", code.String()).
			Dur("latency", latency).
			Int64("latency_ms", latency.Milliseconds()).
			Msg("grpc server request")

		return resp, err
	}
}

func requestIDFromMetadata(ctx context.Context) string {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return ""
	}
	values := md.Get(logger.MetadataRequestID)
	if len(values) == 0 {
		return ""
	}
	return values[0]
}
