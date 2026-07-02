COMPOSE        := docker compose
DEV_COMPOSE    := $(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml
PORT           ?= 25056
export PORT
MYSQL_CONTAINER     := tumlumtala-users-mysql
DATABASE_NAME       ?= tumlumtala_messenger
DATABASE_USER       ?= tumlum
DATABASE_PASSWORD   ?= tala
DATABASE_ROOT_PASSWORD ?= root
MIGRATIONS_DIR         := internal/infrastructure/db/migrations
MIGRATIONS_MAIN_DIR    := internal/infrastructure/db/migrations/main
MIGRATIONS_SNAPSHOT_DIR := internal/infrastructure/db/migrations/snapshots
MYSQL_HOST_PORT ?= 23306
MESSENGER_PORT  ?= 25056
DOCKER_GO_IMAGE := golang:1.25
DOCKER_GO_NETWORK := tumlumtala-net
DOCKER_GO_SRC_DIR := $(abspath ..)
DOCKER_GO_RUN := docker run --rm --network $(DOCKER_GO_NETWORK) -v "$(DOCKER_GO_SRC_DIR)":/src -w /src/messenger-service
DOCKER_GO_ENV := -e DB_HOST=tumlumtala-users-mysql -e DB_PORT=3306 -e DB_NAME="$(DATABASE_NAME)" -e DB_USER="$(DATABASE_USER)" -e DB_PASSWORD="$(DATABASE_PASSWORD)" -e SKIP_CDN_UPLOAD -e SKIP_STICKER_UPLOAD

.NOTPARALLEL:

.PHONY: help up start dev down wait-db ensure-db fresh-db \
	migrate-up migrate-main migrate-snapshots \
	migrate-fresh-seeder migrate-fresh-seeder-no-upload \
	seeder build

help:
	@echo "  make up                       Build và start messenger-service"
	@echo "  make start                    Start messenger-service (không build lại)"
	@echo "  make dev                      Start với Air hot reload"
	@echo "  make down                     Stop messenger-service"
	@echo "  make migrate-up               Chạy tất cả SQL migrations"
	@echo "  make migrate-fresh-seeder     Xóa DB, migrate và seed lại"
	@echo "  make seeder                   Chỉ chạy seeder (không drop DB)"
	@echo "  make seeder SEEDER_ONLY=EmojiSeeder,StickerSeeder   Chạy seeder cụ thể"
	@echo "  make seeder SEEDER_SKIP=MessengerSeeder              Bỏ qua seeder cụ thể"

up: ensure-db
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

# Space-separated list of migration filenames to skip (basename only).
# Example: make migrate-up SKIP_MIGRATIONS="002_create_emoji_sticker_schema.sql"
SKIP_MIGRATIONS ?=

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

# migrate-main: creates the core tables (messages, emojis, stickers, themes).
migrate-main: ensure-db
	@echo "→ [messenger-service] main migrations"
	$(call run-sql-dir,$(MIGRATIONS_MAIN_DIR))
	@echo "✅ messenger-service main migrations done"

# migrate-snapshots: creates the user_snapshots table.
# Run this before make replay so the table exists for consumers to insert into.
migrate-snapshots: ensure-db
	@echo "→ [messenger-service] snapshot migrations"
	$(call run-sql-dir,$(MIGRATIONS_SNAPSHOT_DIR))
	@echo "✅ messenger-service snapshot migrations done"

# migrate-up runs both phases for convenience.
migrate-up: migrate-main migrate-snapshots

SEEDER_ONLY ?=
SEEDER_SKIP ?=

seeder:
	@$(DOCKER_GO_RUN) $(DOCKER_GO_ENV) $(DOCKER_GO_IMAGE) go run ./cmd/seed \
			$(if $(SEEDER_ONLY),-only=$(SEEDER_ONLY)) \
			$(if $(SEEDER_SKIP),-skip=$(SEEDER_SKIP))

migrate-fresh-seeder: fresh-db
	@$(MAKE) migrate-up
	@$(MAKE) seeder

migrate-fresh-seeder-no-upload: fresh-db
	@$(MAKE) migrate-up
	@SKIP_CDN_UPLOAD=true $(MAKE) seeder

migrate-fresh-seeder-no-sticker-upload: fresh-db
	@$(MAKE) migrate-up
	@SKIP_STICKER_UPLOAD=true $(MAKE) seeder

build:
	@$(COMPOSE) build messenger-service
