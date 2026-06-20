FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
COPY ../contracts ../contracts
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o auth-service ./cmd/api

FROM alpine:3.21
WORKDIR /app
COPY --from=builder /app/auth-service .
EXPOSE 25053
CMD ["./auth-service"]
