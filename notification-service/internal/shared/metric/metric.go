package metric

import (
	"strconv"

	"github.com/prometheus/client_golang/prometheus"
)

var (
	HTTPRequestCount = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total HTTP requests handled by the gateway.",
		},
		[]string{"method", "path", "status"},
	)
	HTTPRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "request_duration_seconds",
			Help:    "HTTP request duration in seconds.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path", "status"},
	)
	GRPCClientDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "grpc_client_duration_seconds",
			Help:    "gRPC client call duration in seconds.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"service", "method"},
	)
	GRPCClientErrors = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "grpc_client_errors_total",
			Help: "Total gRPC client errors.",
		},
		[]string{"service", "method", "code"},
	)
	GRPCClientRequests = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "grpc_client_requests_total",
			Help: "Total gRPC client requests.",
		},
		[]string{"service", "method", "code"},
	)
)

func Register() {
	prometheus.MustRegister(HTTPRequestCount, HTTPRequestDuration, GRPCClientRequests, GRPCClientDuration, GRPCClientErrors)
}

func StatusLabel(status int) string {
	return strconv.Itoa(status)
}
