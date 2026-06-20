FROM golang:1.25-alpine AS builder
WORKDIR /src
COPY contracts /contracts
COPY auth-service/go.mod auth-service/go.sum* ./
RUN go mod download
COPY auth-service .
RUN CGO_ENABLED=0 go build -o /auth-service ./cmd/api

FROM alpine:3.21
RUN adduser -D -u 10001 app
USER app
COPY --from=builder /auth-service /auth-service
EXPOSE 25053
ENTRYPOINT ["/auth-service"]
