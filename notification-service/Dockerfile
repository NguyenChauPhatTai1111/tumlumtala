FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/notification-api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/notification-worker ./cmd/worker

FROM alpine:3.22 AS api
WORKDIR /app
COPY --from=builder /out/notification-api /app/notification-api
EXPOSE 8888
ENTRYPOINT ["/app/notification-api"]

FROM alpine:3.22 AS worker
WORKDIR /app
COPY --from=builder /out/notification-worker /app/notification-worker
ENTRYPOINT ["/app/notification-worker"]
