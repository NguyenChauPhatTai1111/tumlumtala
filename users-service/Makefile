COMPOSE := docker compose
DEV_COMPOSE := $(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml
PORT ?= 25052
export PORT
MYSQL_CONTAINER := tumlumtala-users-mysql
DATABASE_NAME ?= tumlumtala_users
DATABASE_USER ?= tumlum
DATABASE_PASSWORD ?= tala
MIGRATIONS_DIR := internal/infrastructure/db/migrations
SEEDER_CMD := ./cmd/seed
REPLAY_CMD := ./cmd/replay
DOCKER_GO_IMAGE := golang:1.25
DOCKER_GO_NETWORK := tumlumtala-net
DOCKER_GO_SRC_DIR := $(abspath ..)
DOCKER_GO_RUN := docker run --rm --network $(DOCKER_GO_NETWORK) -v "$(DOCKER_GO_SRC_DIR)":/src -w /src/users-service
DOCKER_GO_ENV := -e DB_HOST=tumlumtala-users-mysql -e DB_PORT=3306 -e DB_NAME="$(DATABASE_NAME)" -e DB_USER="$(DATABASE_USER)" -e DB_PASSWORD="$(DATABASE_PASSWORD)" -e KAFKA_BROKERS=tumlumtala-kafka:9092 -e SEED_NOOP_KAFKA

.NOTPARALLEL:

.PHONY: help up start dev down wait-db ensure-db fresh-db migrate-up seed replay migrate-fresh-seeder test build

help:
	@echo "  make up                               Build và start users-service"
	@echo "  make start                            Start users-service"
	@echo "  make dev                              Start với Air hot reload"
	@echo "  make down                             Stop users-service"
	@echo "  make migrate-up                       Chạy tất cả SQL migrations"
	@echo "  make migrate-fresh-seeder             Xóa volume DB, migrate và seed lại"
	@echo "  make seed                             Chạy tất cả seeder"
	@echo "  make seed SEEDER_ONLY=UserSeeder      Chạy seeder cụ thể"

up: migrate-up
	@$(COMPOSE) up -d --build

start:
	@$(COMPOSE) up -d

dev:
	@$(DEV_COMPOSE) up -d --build

down:
	@$(COMPOSE) down --remove-orphans

wait-db:
	@docker network inspect tumlumtala-net >/dev/null 2>&1 || docker network create tumlumtala-net
	@docker volume inspect users-service_mysql_data >/dev/null 2>&1 || docker volume create users-service_mysql_data
	@$(COMPOSE) up -d --wait users-mysql

ensure-db: wait-db
	@docker exec -i \
		-e MYSQL_DATABASE="$(DATABASE_NAME)" \
		-e MYSQL_USER="$(DATABASE_USER)" \
		-e MYSQL_PASSWORD="$(DATABASE_PASSWORD)" \
		$(MYSQL_CONTAINER) sh -s -- ensure < scripts/database.sh

fresh-db: wait-db
	@docker exec -i \
		-e MYSQL_DATABASE="$(DATABASE_NAME)" \
		-e MYSQL_USER="$(DATABASE_USER)" \
		-e MYSQL_PASSWORD="$(DATABASE_PASSWORD)" \
		$(MYSQL_CONTAINER) sh -s -- fresh < scripts/database.sh

migrate-up: ensure-db
	@set -e; found=0; \
	for file in $$(find "$(MIGRATIONS_DIR)" -maxdepth 1 -type f -name '*.sql' | sort); do \
		found=1; \
		echo "→ migrate $$file"; \
		docker exec -i -e MYSQL_DATABASE="$(DATABASE_NAME)" -e MYSQL_USER="$(DATABASE_USER)" -e MYSQL_PASSWORD="$(DATABASE_PASSWORD)" $(MYSQL_CONTAINER) sh -c 'MYSQL_PWD="$$MYSQL_PASSWORD" mysql -u"$$MYSQL_USER" "$$MYSQL_DATABASE"' < "$$file"; \
	done; \
	if [ "$$found" -eq 0 ]; then echo "No user migrations found"; fi
	@echo "✅ users-service migrated"

SEEDER_ONLY ?=

seed: wait-db
	@echo "→ run Go UserSeeder in Docker"
	@$(DOCKER_GO_RUN) $(DOCKER_GO_ENV) $(DOCKER_GO_IMAGE) go run $(SEEDER_CMD) $(if $(SEEDER_ONLY),-only=$(SEEDER_ONLY))

# replay publishes user.created events for every user in the DB so that all
# consumer services (messenger, movies, …) can sync their user_snapshots tables.
# Run this after a fresh seed while consumer services are running.
REPLAY_FLAGS ?= --no-wait

replay: wait-db
	@echo "→ publishing user.upserted events to Kafka in Docker"
	@$(DOCKER_GO_RUN) $(DOCKER_GO_ENV) $(DOCKER_GO_IMAGE) go run $(REPLAY_CMD) $(REPLAY_FLAGS)
	@echo "✅ user.upserted events published — consumers will sync when they start"

migrate-fresh-seeder: fresh-db migrate-up seed
	@echo "✅ users-service database recreated and seeded"

test:
	@go test ./...

build:
	@$(COMPOSE) build users-service
