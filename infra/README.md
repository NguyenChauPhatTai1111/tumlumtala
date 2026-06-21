# Tumlumtala Infrastructure

This compose stack runs shared local infrastructure for development:

- Redis
- Prometheus
- Loki
- Promtail
- Grafana
- Jaeger

## Start

Create the shared network once:

```bash
docker network create tumlumtala-net
```

Start infrastructure:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Start application services, for example:

```bash
docker compose -f gateway/docker-compose.yml up -d
```

## URLs

- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- Loki: http://localhost:3100
- Jaeger: http://localhost:16686

Grafana default login:

```text
admin / admin
```

## Logs

Docker logs:

```bash
docker compose -f gateway/docker-compose.yml logs -f gateway
```

Grafana Loki query examples:

```logql
{service="gateway"}
{service="gateway"} |= "your-trace-id"
{service="gateway", level="error"}
{service="gateway", component="http"} | json
```

## Metrics

Prometheus target page:

```text
http://localhost:9090/targets
```

Gateway metrics endpoint:

```text
http://localhost:8888/metrics
```

PromQL examples:

```promql
sum by (method, path) (rate(http_requests_total{job="gateway"}[5m]))
histogram_quantile(0.95, sum by (le, method, path) (rate(request_duration_seconds_bucket{job="gateway"}[5m])))
sum by (service, method, code) (rate(grpc_client_requests_total{job="gateway"}[5m]))
```

## Traces

Jaeger is ready to receive OpenTelemetry OTLP traffic:

```text
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
```

The Go services still need OpenTelemetry instrumentation before traces appear in Jaeger.
