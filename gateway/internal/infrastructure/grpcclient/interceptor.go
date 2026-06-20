package grpcclient

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/tumlumtala/gateway/internal/shared/contextx"
	"github.com/tumlumtala/gateway/internal/shared/metrics"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

func UnaryClientInterceptor(logger *slog.Logger) grpc.UnaryClientInterceptor {
	return func(ctx context.Context, method string, req any, reply any, cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {
		requestID := contextx.RequestID(ctx)
		traceID := contextx.TraceID(ctx)
		ctx = metadata.AppendToOutgoingContext(ctx, "x-request-id", requestID, "x-trace-id", traceID)

		serviceName, methodName := splitFullMethod(method)
		startedAt := time.Now()
		err := invoker(ctx, method, req, reply, cc, opts...)
		duration := time.Since(startedAt)

		metrics.GRPCClientDuration.WithLabelValues(serviceName, methodName).Observe(duration.Seconds())
		if err != nil {
			code := status.Code(err).String()
			metrics.GRPCClientRequests.WithLabelValues(serviceName, methodName, code).Inc()
			metrics.GRPCClientErrors.WithLabelValues(serviceName, methodName, code).Inc()
			logger.ErrorContext(ctx, "grpc client error",
				slog.String("trace_id", traceID),
				slog.String("request_id", requestID),
				slog.String("service", serviceName),
				slog.String("method", methodName),
				slog.String("code", code),
				slog.Int64("duration_ms", duration.Milliseconds()),
				slog.Any("error", err),
			)
			return err
		}

		metrics.GRPCClientRequests.WithLabelValues(serviceName, methodName, codes.OK.String()).Inc()
		logger.InfoContext(ctx, "grpc client request",
			slog.String("trace_id", traceID),
			slog.String("request_id", requestID),
			slog.String("service", serviceName),
			slog.String("method", methodName),
			slog.String("code", codes.OK.String()),
			slog.Int64("duration_ms", duration.Milliseconds()),
		)
		return nil
	}
}

func splitFullMethod(fullMethod string) (string, string) {
	parts := strings.Split(strings.TrimPrefix(fullMethod, "/"), "/")
	if len(parts) != 2 {
		return "unknown", fullMethod
	}
	return parts[0], parts[1]
}
