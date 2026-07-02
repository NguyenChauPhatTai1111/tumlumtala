COMPOSE := docker compose
DEV_COMPOSE := $(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml
PORT ?= 25055
export PORT
MYSQL_CONTAINER := tumlumtala-users-mysql
DATABASE_NAME ?= tumlumtala_movies
DATABASE_USER ?= tumlum
DATABASE_PASSWORD ?= tala
DATABASE_ROOT_PASSWORD ?= root
MIGRATIONS_DIR          := internal/infrastructure/db/migrations
MIGRATIONS_MAIN_DIR     := internal/infrastructure/db/migrations/main
MIGRATIONS_SNAPSHOT_DIR := internal/infrastructure/db/migrations/snapshots

.NOTPARALLEL:

.PHONY: help up start dev down wait-db ensure-db fresh-db \
	migrate-up migrate-main migrate-snapshots migrate-fresh build

help:
	@echo "  make up                     Build và start movies-service"
	@echo "  make start                  Start movies-service (không build lại)"
	@echo "  make dev                    Start với Air hot reload"
	@echo "  make down                   Stop movies-service"
	@echo "  make migrate-up             Chạy tất cả SQL migrations"
	@echo "  make migrate-fresh          Xóa DB, migrate lại"

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
		-e MYSQL_ROOT_PASSWORD="$(DATABASE_ROOT_PASSWORD)" \
		$(MYSQL_CONTAINER) sh -s -- ensure < scripts/database.sh

fresh-db: wait-db
	@docker exec -i \
		-e MYSQL_DATABASE="$(DATABASE_NAME)" \
		-e MYSQL_USER="$(DATABASE_USER)" \
		-e MYSQL_PASSWORD="$(DATABASE_PASSWORD)" \
		-e MYSQL_ROOT_PASSWORD="$(DATABASE_ROOT_PASSWORD)" \
		$(MYSQL_CONTAINER) sh -s -- fresh < scripts/database.sh

define run-sql-dir
	@set -e; found=0; \
	for file in $$(find "$(1)" -maxdepth 1 -type f -name '*.sql' | sort); do \
		found=1; \
		name=$$(basename $$file); \
		printf "→ %s\n" "$$name"; \
		docker exec -i \
			-e MYSQL_DATABASE="$(DATABASE_NAME)" \
			-e MYSQL_USER="$(DATABASE_USER)" \
			-e MYSQL_PASSWORD="$(DATABASE_PASSWORD)" \
			$(MYSQL_CONTAINER) sh -c 'MYSQL_PWD="$$MYSQL_PASSWORD" mysql -u"$$MYSQL_USER" "$$MYSQL_DATABASE"' < "$$file"; \
		printf "✓ %s\n" "$$name"; \
	done; \
	if [ "$$found" -eq 0 ]; then echo "  (no SQL files in $(1))"; fi
endef

# migrate-main: creates core movie tables.
migrate-main: ensure-db
	@echo "→ [movies-service] main migrations"
	$(call run-sql-dir,$(MIGRATIONS_MAIN_DIR))
	@echo "✅ movies-service main migrations done"

# migrate-snapshots: creates user_snapshots table.
migrate-snapshots: ensure-db
	@echo "→ [movies-service] snapshot migrations"
	$(call run-sql-dir,$(MIGRATIONS_SNAPSHOT_DIR))
	@echo "✅ movies-service snapshot migrations done"

# migrate-up runs both phases.
migrate-up: migrate-main migrate-snapshots

migrate-fresh: fresh-db migrate-up
	@echo "✅ movies-service database recreated"

build:
	@$(COMPOSE) build movies-service
