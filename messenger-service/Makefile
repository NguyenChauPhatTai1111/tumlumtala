COMPOSE        := docker compose
PORT           ?= 25056
export PORT
MYSQL_CONTAINER     := tumlumtala-users-mysql
DATABASE_NAME       ?= tumlumtala_messenger
DATABASE_USER       ?= tumlum
DATABASE_PASSWORD   ?= tala
DATABASE_ROOT_PASSWORD ?= root
MIGRATIONS_DIR := internal/infrastructure/db/migrations
MYSQL_HOST_PORT ?= 23306
MESSENGER_PORT  ?= 25056

.NOTPARALLEL:

.PHONY: help up start down wait-db ensure-db fresh-db \
	migrate-up migrate-fresh-seeder migrate-fresh-seeder-no-upload \
	seeder build

help:
	@echo "  make up                       Build và start messenger-service"
	@echo "  make start                    Start messenger-service (không build lại)"
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

migrate-up: ensure-db
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  messenger-service migrations"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@set -e; found=0; \
	for file in $$(find "$(MIGRATIONS_DIR)" -maxdepth 1 -type f -name '*.sql' | sort); do \
		found=1; \
		name=$$(basename $$file); \
		skip=0; \
		for s in $(SKIP_MIGRATIONS); do \
			if [ "$$name" = "$$s" ]; then skip=1; break; fi; \
		done; \
		if [ "$$skip" -eq 1 ]; then \
			printf "⏭  skip   %s\n" "$$name"; \
			continue; \
		fi; \
		printf "→  run    %s\n" "$$name"; \
		docker exec -i \
			-e MYSQL_DATABASE="$(DATABASE_NAME)" \
			-e MYSQL_USER="$(DATABASE_USER)" \
			-e MYSQL_PASSWORD="$(DATABASE_PASSWORD)" \
			$(MYSQL_CONTAINER) sh -c 'MYSQL_PWD="$$MYSQL_PASSWORD" mysql -u"$$MYSQL_USER" "$$MYSQL_DATABASE"' < "$$file"; \
		printf "✓  done   %s\n" "$$name"; \
	done; \
	if [ "$$found" -eq 0 ]; then echo "  (no migration files found)"; fi
	@echo ""
	@echo "✅ messenger-service migrations completed"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""

SEEDER_ONLY ?=
SEEDER_SKIP ?=

seeder:
	@DB_HOST=localhost DB_PORT=$(MYSQL_HOST_PORT) \
		DB_NAME="$(DATABASE_NAME)" \
		DB_USER="$(DATABASE_USER)" \
		DB_PASSWORD="$(DATABASE_PASSWORD)" \
		go run ./cmd/seed \
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
