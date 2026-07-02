COMPOSE := docker compose
DEV_COMPOSE := $(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml
PORT ?= 25054
export PORT
MYSQL_CONTAINER := tumlumtala-users-mysql
DATABASE_NAME ?= tumlumtala_authorization
DATABASE_USER ?= tumlum
DATABASE_PASSWORD ?= tala
MIGRATIONS_DIR := internal/infrastructure/db/migrations

.NOTPARALLEL:

.PHONY: help up start dev down wait-db ensure-db fresh-db migrate-up migrate-fresh-seeder

help:
	@echo "  make up                     Build và start authorization-service"
	@echo "  make start                  Start authorization-service"
	@echo "  make dev                    Start với Air hot reload"
	@echo "  make down                   Stop authorization-service"
	@echo "  make migrate-up             Chạy tất cả SQL migrations"
	@echo "  make migrate-fresh-seeder   Xóa DB, migrate lại"

up: migrate-up
	@$(COMPOSE) up -d --build

start:
	@$(COMPOSE) up -d

dev:
	@$(DEV_COMPOSE) up -d --build

down:
	@$(COMPOSE) down --remove-orphans

wait-db:
	@$(MAKE) -C ../users-service wait-db

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
		docker exec -i \
			-e MYSQL_DATABASE="$(DATABASE_NAME)" \
			-e MYSQL_USER="$(DATABASE_USER)" \
			-e MYSQL_PASSWORD="$(DATABASE_PASSWORD)" \
			$(MYSQL_CONTAINER) sh -c 'MYSQL_PWD="$$MYSQL_PASSWORD" mysql -u"$$MYSQL_USER" "$$MYSQL_DATABASE"' < "$$file"; \
	done; \
	if [ "$$found" -eq 0 ]; then echo "No authorization migrations found"; fi
	@echo "✅ authorization-service migrated"

migrate-fresh-seeder: fresh-db migrate-up
	@echo "✅ authorization-service fresh/migrate completed"
