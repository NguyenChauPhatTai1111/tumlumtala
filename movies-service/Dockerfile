FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /movies-service ./cmd/api

FROM alpine:3.22
RUN adduser -D -u 10001 app
USER app
COPY --from=build /movies-service /movies-service
EXPOSE 25055
ENTRYPOINT ["/movies-service"]
