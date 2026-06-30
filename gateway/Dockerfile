FROM golang:1.25-alpine AS builder

WORKDIR /app/gateway

RUN apk add --no-cache git

COPY gateway/go.mod gateway/go.sum ./
COPY contracts /app/contracts
RUN go mod download

COPY gateway /app/gateway

RUN go build -o /app/bin/gateway ./cmd/api

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/bin/gateway .
COPY gateway/words /app/words

EXPOSE 8080

CMD ["./gateway"]
