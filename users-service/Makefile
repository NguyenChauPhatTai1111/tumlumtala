COMPOSE := docker compose
PORT ?= 25052
export PORT
INFRA_COMPOSE := docker compose -f ../infra/docker-compose.yml
MYSQL_CONTAINER := tumlumtala-mysql
DATABASE_NAME ?= tumlumtala_users
DATABASE_USER ?= tumlum
DATABASE_PASSWORD ?= tala
MIGRATIONS_DIR := internal/infrastructure/db/migrations
SEEDER_CMD := ./cmd/seed

.NOTPARALLEL:

.PHONY: help up start down wait-db ensure-db fresh-db migrate-up seed migrate-fresh-seeder test build

help:
	@echo "  make up                     Build và start users-service"
	@echo "  make start                  Start users-service"
	@echo "  make down                   Stop users-service"
	@echo "  make migrate-up             Chạy tất cả SQL migrations"
	@echo "  make migrate-fresh-seeder   Xóa volume DB, migrate và seed lại"

up: migrate-up
	@$(COMPOSE) up -d --build

start: migrate-up
	@$(COMPOSE) up -d

down:
	@$(COMPOSE) down --remove-orphans

wait-db:
	@docker network inspect tumlumtala-net >/dev/null 2>&1 || docker network create tumlumtala-net
	@docker volume inspect users-service_mysql_data >/dev/null 2>&1 || docker volume create users-service_mysql_data
	@$(INFRA_COMPOSE) up -d --wait mysql

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

seed: wait-db
	@echo "→ run Go UserSeeder"
	@DB_HOST=localhost DB_PORT=$${MYSQL_HOST_PORT:-23306} DB_NAME="$(DATABASE_NAME)" DB_USER="$(DATABASE_USER)" DB_PASSWORD="$(DATABASE_PASSWORD)" go run $(SEEDER_CMD)

migrate-fresh-seeder: fresh-db migrate-up seed
	@echo "✅ users-service database recreated and seeded"

test:
	@go test ./...

build:
	@$(COMPOSE) build users-service
