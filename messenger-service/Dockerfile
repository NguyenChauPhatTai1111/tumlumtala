FROM golang:1.25-alpine AS builder

WORKDIR /app/messenger-service

RUN apk add --no-cache git

COPY messenger-service/go.mod messenger-service/go.sum ./
COPY contracts /app/contracts
COPY kafka-service /app/kafka-service
RUN go mod download

COPY messenger-service /app/messenger-service

RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/messenger-service ./cmd/api

FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/bin/messenger-service .
EXPOSE 25056
ENTRYPOINT ["/app/messenger-service"]
