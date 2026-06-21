package grpcclient

import (
	"context"
	"strings"
	"time"

	"github.com/rs/zerolog"
	"github.com/tumlumtala/gateway/internal/shared/contextx"
	"github.com/tumlumtala/gateway/internal/shared/id"
	"github.com/tumlumtala/gateway/internal/shared/logger"
	"github.com/tumlumtala/gateway/internal/shared/metrics"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

func UnaryClientInterceptor(base zerolog.Logger) grpc.UnaryClientInterceptor {
	return func(ctx context.Context, method string, req any, reply any, cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {
		requestID := contextx.RequestID(ctx)
		traceID := contextx.TraceID(ctx)
		if requestID == "" {
			requestID = id.New()
			ctx = contextx.WithRequestID(ctx, requestID)
		}
		if traceID == "" {
			traceID = id.New()
			ctx = contextx.WithTraceID(ctx, traceID)
		}

		ctx = metadata.AppendToOutgoingContext(
			ctx,
			logger.MetadataRequestID, requestID,
			logger.MetadataTraceID, traceID,
		)
		ctx = logger.WithRequestFields(ctx, base)

		serviceName, methodName := splitFullMethod(method)
		startedAt := time.Now()
		err := invoker(ctx, method, req, reply, cc, opts...)
		duration := time.Since(startedAt)

		metrics.GRPCClientDuration.WithLabelValues(serviceName, methodName).Observe(duration.Seconds())
		log := logger.FromContext(ctx, base)
		if err != nil {
			code := status.Code(err).String()
			metrics.GRPCClientRequests.WithLabelValues(serviceName, methodName, code).Inc()
			metrics.GRPCClientErrors.WithLabelValues(serviceName, methodName, code).Inc()
			log.Error().
				Err(err).
				Str("component", "grpc_client").
				Str("target_service", serviceName).
				Str("method", methodName).
				Str("grpc_code", code).
				Dur("latency", duration).
				Int64("latency_ms", duration.Milliseconds()).
				Msg("grpc client request")
			return err
		}

		metrics.GRPCClientRequests.WithLabelValues(serviceName, methodName, codes.OK.String()).Inc()
		log.Info().
			Str("component", "grpc_client").
			Str("target_service", serviceName).
			Str("method", methodName).
			Str("grpc_code", codes.OK.String()).
			Dur("latency", duration).
			Int64("latency_ms", duration.Milliseconds()).
			Msg("grpc client request")
		return nil
	}
}

func splitFullMethod(fullMethod string) (string, string) {
	parts := strings.Split(strings.TrimPrefix(fullMethod, "/"), "/")
	if len(parts) != 2 {
		return "unknown", fullMethod
	}
	serviceParts := strings.Split(parts[0], ".")
	return serviceParts[len(serviceParts)-1], parts[1]
}
