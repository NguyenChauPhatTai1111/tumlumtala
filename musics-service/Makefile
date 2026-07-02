COMPOSE := docker compose
DEV_COMPOSE := $(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml
PORT ?= 25057
export PORT
MYSQL_CONTAINER        := tumlumtala-users-mysql
DATABASE_NAME          ?= tumlumtala_musics
DATABASE_USER          ?= tumlum
DATABASE_PASSWORD      ?= tala
DATABASE_ROOT_PASSWORD ?= root
MIGRATIONS_MAIN_DIR     := internal/infrastructure/db/migrations/main
MIGRATIONS_SNAPSHOT_DIR := internal/infrastructure/db/migrations/snapshots

.NOTPARALLEL:

.PHONY: help up start dev down wait-db ensure-db fresh-db \
	migrate-up migrate-main migrate-snapshots migrate-fresh build verify-routes

help:
	@echo "  make up                     Build và start musics-service"
	@echo "  make start                  Start musics-service (không build lại)"
	@echo "  make dev                    Start với Air hot reload"
	@echo "  make down                   Stop musics-service"
	@echo "  make migrate-up             Chạy tất cả SQL migrations"
	@echo "  make migrate-fresh          Xóa DB, migrate lại"

up: migrate-up
	@$(COMPOSE) up -d --build
	@$(MAKE) verify-routes

start:
	@$(COMPOSE) up -d
	@$(MAKE) verify-routes

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

migrate-main: ensure-db
	@echo "→ [musics-service] main migrations"
	$(call run-sql-dir,$(MIGRATIONS_MAIN_DIR))
	@echo "✅ musics-service main migrations done"

migrate-snapshots: ensure-db
	@echo "→ [musics-service] snapshot migrations"
	$(call run-sql-dir,$(MIGRATIONS_SNAPSHOT_DIR))
	@echo "✅ musics-service snapshot migrations done"

migrate-up: migrate-main migrate-snapshots

migrate-fresh: fresh-db migrate-up
	@echo "✅ musics-service database recreated"

build:
	@$(COMPOSE) build musics-service

# Every protected route must reach the auth middleware. A 404 here means the
# running image is older than the API contract even when the container is up.
verify-routes:
	@set -e; \
	base="http://localhost:$(PORT)/api/v1/music"; \
	for attempt in $$(seq 1 30); do \
		code=$$(curl --silent --output /dev/null --write-out '%{http_code}' "$$base/liked" || true); \
		[ "$$code" = "401" ] && break; \
		[ "$$attempt" = "30" ] && { echo "❌ musics-service is not ready (HTTP $$code)"; exit 1; }; \
		sleep 1; \
	done; \
	for route in \
		"GET liked" "POST liked" "DELETE liked/route-check" \
		"GET recent" "POST recent" \
		"GET search-history" "POST search-history" \
		"GET search/tracks" "GET tracks/route-check" "GET artists/route-check" "GET albums/route-check" "GET recommendations" \
		"GET playlists" "POST playlists" "DELETE playlists/1" "POST playlists/1/tracks" \
		"GET library" "POST library" "DELETE library/1" \
		"GET events" "POST events" "GET dna" \
		"POST ai/sessions" "GET ai/sessions/route-check" \
		"POST ai/sessions/route-check/candidates" "POST ai/sessions/route-check/messages" \
		"POST smart-queue" "POST radio" "POST dynamic-playlist" \
		"GET insights/journey" "GET insights/heatmap" "GET discover" "GET challenges" \
		"POST explain" "POST compare" "POST album-review" "POST remix-discovery" \
		"POST sync/rooms" "POST sync/rooms/join" "POST sync/rooms/route-check/recommendations"; do \
		set -- $$route; method="$$1"; path="$$2"; \
		code=$$(curl --silent --output /dev/null --write-out '%{http_code}' --request "$$method" "$$base/$$path"); \
		if [ "$$code" != "401" ]; then \
			echo "❌ missing music route: $$method /api/v1/music/$$path (HTTP $$code)"; \
			exit 1; \
		fi; \
	done; \
	echo "✅ all music API routes are active"
