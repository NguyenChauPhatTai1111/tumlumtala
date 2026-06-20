FROM golang:1.25-alpine AS builder
WORKDIR /src
COPY contracts /contracts
COPY authorization-service/go.mod authorization-service/go.sum* ./
RUN go mod download
COPY authorization-service .
RUN CGO_ENABLED=0 go build -o /authorization-service ./cmd/api

FROM alpine:3.21
RUN adduser -D -u 10001 app
USER app
COPY --from=builder /authorization-service /authorization-service
EXPOSE 25054
ENTRYPOINT ["/authorization-service"]
