FROM golang:1.25-alpine AS build
WORKDIR /src
COPY contracts /contracts
COPY users-service/go.mod users-service/go.sum* ./
RUN go mod download
COPY users-service .
RUN CGO_ENABLED=0 go build -o /users-service ./cmd/api

FROM alpine:3.22
RUN adduser -D -u 10001 app
USER app
COPY --from=build /users-service /users-service
EXPOSE 25052
ENTRYPOINT ["/users-service"]
