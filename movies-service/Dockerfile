FROM golang:1.25-alpine AS build
WORKDIR /workspace

# Copy local dependencies first (referenced via replace directives)
COPY kafka-service/   kafka-service/
COPY contracts/       contracts/

# Copy movies-service
WORKDIR /workspace/movies-service
COPY movies-service/go.mod movies-service/go.sum* ./
RUN go mod download
COPY movies-service/ .
RUN CGO_ENABLED=0 go build -o /movies-service ./cmd/api

FROM alpine:3.22
RUN adduser -D -u 10001 app
USER app
COPY --from=build /movies-service /movies-service
EXPOSE 25055
ENTRYPOINT ["/movies-service"]
