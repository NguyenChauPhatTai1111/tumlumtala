package observability

import (
	"context"
	"fmt"
	"runtime/debug"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

const tracerName = "github.com/tumlumtala/gateway"

func StartSpan(ctx context.Context, name string, attrs ...attribute.KeyValue) (context.Context, trace.Span) {
	return otel.Tracer(tracerName).Start(ctx, name, trace.WithAttributes(attrs...))
}

func Trace(ctx context.Context, name string, fn func(context.Context) error, attrs ...attribute.KeyValue) (err error) {
	ctx, span := StartSpan(ctx, name, attrs...)
	defer endSpan(span, &err)

	return fn(ctx)
}

func TraceResult[T any](ctx context.Context, name string, fn func(context.Context) (T, error), attrs ...attribute.KeyValue) (result T, err error) {
	ctx, span := StartSpan(ctx, name, attrs...)
	defer endSpan(span, &err)

	return fn(ctx)
}

func TraceVoid(ctx context.Context, name string, fn func(context.Context), attrs ...attribute.KeyValue) {
	ctx, span := StartSpan(ctx, name, attrs...)
	defer func() {
		if recovered := recover(); recovered != nil {
			recordPanic(span, recovered)
			span.End()
			panic(recovered)
		}
		span.End()
	}()

	fn(ctx)
}

func RecordError(span trace.Span, err error) {
	if err == nil {
		return
	}
	span.RecordError(err)
	span.SetStatus(codes.Error, err.Error())
}

func endSpan(span trace.Span, err *error) {
	if recovered := recover(); recovered != nil {
		recordPanic(span, recovered)
		span.End()
		panic(recovered)
	}
	RecordError(span, *err)
	span.End()
}

func recordPanic(span trace.Span, recovered any) {
	err := fmt.Errorf("panic: %v", recovered)
	span.RecordError(err)
	span.AddEvent("panic", trace.WithAttributes(
		attribute.String("exception.type", fmt.Sprintf("%T", recovered)),
		attribute.String("exception.message", fmt.Sprint(recovered)),
		attribute.String("exception.stacktrace", string(debug.Stack())),
	))
	span.SetStatus(codes.Error, err.Error())
}

func AttrOperation(name string) attribute.KeyValue {
	return attribute.String("app.operation", name)
}

func AttrServiceName(name string) attribute.KeyValue {
	return attribute.String("app.service_name", name)
}

func AttrLayer(layer string) attribute.KeyValue {
	return attribute.String("app.layer", layer)
}

func AttrResourceType(resourceType string) attribute.KeyValue {
	return attribute.String("app.resource_type", resourceType)
}
