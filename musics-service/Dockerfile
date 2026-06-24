FROM golang:1.25.1-bookworm AS builder

RUN apt-get update && apt-get install -y --no-install-recommends git curl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY musics-service/go.mod musics-service/go.sum ./musics-service/
COPY contracts/ ./contracts/
COPY kafka-service/ ./kafka-service/

WORKDIR /app/musics-service
RUN go mod download

COPY musics-service/ ./

RUN CGO_ENABLED=0 GOOS=linux go build \
    -o /app/server \
    ./cmd/api

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates tzdata && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/server .

EXPOSE 25057

CMD ["./server"]
