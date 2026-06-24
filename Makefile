-include .env

SERVICES := auth-service authorization-service users-service gateway messenger-service

# Service port registry. Every new service must reserve one unique TCP port
# here before being added to the orchestration targets.
USER_SERVICE_PORT      ?= 25052
AUTH_SERVICE_PORT      ?= 25053
AUTHZ_SERVICE_PORT     ?= 25054
MESSENGER_SERVICE_PORT ?= 25056
MUSICS_SERVICE_PORT    ?= 25057
SERVICE_PORTS := $(USER_SERVICE_PORT) $(AUTH_SERVICE_PORT) $(AUTHZ_SERVICE_PORT) $(MESSENGER_SERVICE_PORT) $(MUSICS_SERVICE_PORT)

.NOTPARALLEL:

.PHONY: help ports validate-ports dev down up build start network \
	start-infra up-infra down-infra \
	start-auth up-auth build-auth down-auth \
	start-authz up-authz build-authz down-authz \
	start-user up-user build-user down-user \
	start-messenger up-messenger build-messenger down-messenger \
	start-musics up-musics build-musics down-musics \
	start-gateway up-gateway build-gateway down-gateway \
	migrate-up migrate-all migrate-main migrate-snapshots \
	migrate-user migrate-auth migrate-authz \
	migrate-movie-main migrate-messenger-main migrate-musics-main \
	migrate-messenger-snapshots migrate-movie-snapshots migrate-musics-snapshots \
	seed-main seed-users seed-messenger seed-movie seed-user-roles \
	migrate-movie migrate-messenger migrate-musics \
	replay-snapshots replay replay-user-snapshots \
	migrate-fresh-seeder migrate-fresh-seeder-auth migrate-fresh-seeder-authz migrate-fresh-seeder-user migrate-fresh-seeder-movie migrate-fresh-seeder-messenger migrate-fresh-seeder-musics migrate-fresh-seeder-messenger-no-upload migrate-fresh-seeder-messenger-no-sticker-upload seed-user-roles flush-cache \
	proto build-proto run-proto \
	test \
	frontend down-frontend logs

help:
	@echo "Development:"
	@echo "  make start                            Down rồi up toàn bộ hệ thống"
	@echo "  make up                               docker compose up -d (không build lại)"
	@echo "  make build                            docker compose up -d --build (build lại image)"
	@echo "  make down                             Stop toàn bộ hệ thống"
	@echo "  make frontend                         Start frontend dev server (npm run dev)"
	@echo "  make start-auth                       Start auth-service"
	@echo "  make start-authz                      Start authorization-service"
	@echo "  make start-user                       Start users-service"
	@echo "  make start-gateway                    Start gateway"
	@echo "Migrations:"
	@echo "  make migrate-up                       Migrate tất cả service"
	@echo "  make migrate-auth                     Migrate auth-service"
	@echo "  make migrate-authz                    Migrate authorization-service"
	@echo "  make migrate-user                     Migrate users-service"
	@echo "  make migrate-fresh-seeder             Fresh database và seed tất cả service"
	@echo "  make migrate-fresh-seeder-auth        Fresh/seed auth-service"
	@echo "  make migrate-fresh-seeder-authz       Fresh/seed authorization-service"
	@echo "  make migrate-fresh-seeder-user        Fresh/seed users-service"
	@echo "  make migrate-movie                    Migrate movies-service"
	@echo "  make migrate-fresh-seeder-movie       Fresh/seed movies-service"
	@echo "  make migrate-messenger                Migrate messenger-service"
	@echo "  make migrate-fresh-seeder-messenger                  Fresh/seed messenger-service"
	@echo "  make migrate-fresh-seeder-messenger-no-sticker-upload  Fresh/seed messenger-service (skip sticker CDN upload)"
	@echo "  make migrate-musics                   Migrate musics-service"
	@echo "  make migrate-fresh-seeder-musics      Fresh/seed musics-service"
	@echo "  make replay-user-snapshots            Publish user.created events → sync user_snapshots toàn service"
	@echo "Ports:"
	@echo "  users-service=$(USER_SERVICE_PORT), auth-service=$(AUTH_SERVICE_PORT), authorization-service=$(AUTHZ_SERVICE_PORT), messenger-service=$(MESSENGER_SERVICE_PORT), musics-service=$(MUSICS_SERVICE_PORT)"

ports:
	@echo "users-service          $(USER_SERVICE_PORT)"
	@echo "auth-service           $(AUTH_SERVICE_PORT)"
	@echo "authorization-service  $(AUTHZ_SERVICE_PORT)"
	@echo "messenger-service      $(MESSENGER_SERVICE_PORT)"
	@echo "musics-service         $(MUSICS_SERVICE_PORT)"

validate-ports:
	@if [ "$(words $(sort $(SERVICE_PORTS)))" -ne "$(words $(SERVICE_PORTS))" ]; then \
		echo "❌ Service ports must be unique: $(SERVICE_PORTS)"; exit 1; \
	fi
	@for port in $(SERVICE_PORTS); do \
		case "$$port" in *[!0-9]*|'') echo "❌ Invalid service port: $$port"; exit 1;; esac; \
		if [ "$$port" -lt 1 ] || [ "$$port" -gt 65535 ]; then \
			echo "❌ Port $$port is outside the valid range 1-65535"; exit 1; \
		fi; \
	done
	@echo "✅ Service ports are valid and unique"

dev: validate-ports start
	@echo "→ Starting frontend dev server..."
	@cd frontend && npm run dev &
	@echo "✅ All services up. Streaming logs (Ctrl+C to stop logs and all services)..."
	@trap 'exit 0' INT TERM; bash scripts/logs.sh; wait

down: down-frontend down-auth down-authz down-user down-messenger down-infra down-gateway
	@echo "✅ All services stopped"

down-frontend:
	@bash scripts/kill-frontend.sh

up: network up-infra up-user up-auth up-authz up-messenger up-gateway
	@echo "✅ All services up"

build: network up-infra build-user build-auth build-authz build-messenger build-gateway
	@echo "✅ All services built and up"

start: validate-ports down up
	@echo "✅ All services started"

network:
	@docker network inspect tumlumtala-net >/dev/null 2>&1 || docker network create tumlumtala-net
	@docker volume inspect users-service_mysql_data >/dev/null 2>&1 || docker volume create users-service_mysql_data

up-infra: network
	@docker compose -f infra/docker-compose.yml up -d

start-infra: network
	@docker compose -f infra/docker-compose.yml up -d

down-infra:
	@docker compose -f infra/docker-compose.yml down --remove-orphans

up-auth: validate-ports
	@$(MAKE) -C auth-service start PORT=$(AUTH_SERVICE_PORT)

build-auth: validate-ports
	@$(MAKE) -C auth-service up PORT=$(AUTH_SERVICE_PORT)

start-auth: validate-ports
	@$(MAKE) -C auth-service start PORT=$(AUTH_SERVICE_PORT)

down-auth:
	@$(MAKE) -C auth-service down

up-authz: validate-ports
	@$(MAKE) -C authorization-service start PORT=$(AUTHZ_SERVICE_PORT)

build-authz: validate-ports
	@$(MAKE) -C authorization-service up PORT=$(AUTHZ_SERVICE_PORT)

start-authz: validate-ports
	@$(MAKE) -C authorization-service start PORT=$(AUTHZ_SERVICE_PORT)

down-authz:
	@$(MAKE) -C authorization-service down

up-user: validate-ports
	@$(MAKE) -C users-service start PORT=$(USER_SERVICE_PORT)

build-user: validate-ports
	@$(MAKE) -C users-service up PORT=$(USER_SERVICE_PORT)

start-user: validate-ports
	@$(MAKE) -C users-service start PORT=$(USER_SERVICE_PORT)

down-user:
	@$(MAKE) -C users-service down

up-gateway:
	@$(MAKE) -C gateway start

build-gateway:
	@$(MAKE) -C gateway up

start-gateway:
	@$(MAKE) -C gateway start

down-gateway:
	@$(MAKE) -C gateway down

logs:
	@bash scripts/logs.sh

frontend:
	@cd frontend && npm run dev

# ── Phase 1: migrate main tables ────────────────────────────────────────────
# Creates all primary tables (users, movies, messages, emojis, …).
# Does NOT touch snapshot tables.
migrate-main: migrate-user migrate-movie-main migrate-messenger-main migrate-musics-main migrate-auth migrate-authz
	@echo "✅ Phase 1 done — main tables migrated"

migrate-user:
	@$(MAKE) -C users-service migrate-up

migrate-movie-main:
	@$(MAKE) -C movies-service migrate-main

migrate-messenger-main:
	@$(MAKE) -C messenger-service migrate-main

migrate-musics-main:
	@$(MAKE) -C musics-service migrate-main

migrate-auth:
	@$(MAKE) -C auth-service migrate-up

migrate-authz:
	@$(MAKE) -C authorization-service migrate-up

# ── Phase 2: seed main data ──────────────────────────────────────────────────
seed-main: seed-users seed-messenger seed-movie seed-user-roles
	@echo "✅ Phase 2 done — main data seeded"

seed-users:
	@$(MAKE) -C users-service seed SEED_NOOP_KAFKA=1

seed-messenger:
	@$(MAKE) -C messenger-service seeder

seed-movie:
	@true   # placeholder — add: $(MAKE) -C movies-service seed when seeder exists

# ── Phase 3: migrate snapshot tables ────────────────────────────────────────
# Creates user_snapshots in each consumer service DB.
migrate-snapshots: migrate-messenger-snapshots migrate-movie-snapshots migrate-musics-snapshots
	@echo "✅ Phase 3 done — snapshot tables created"

migrate-messenger-snapshots:
	@$(MAKE) -C messenger-service migrate-snapshots

migrate-movie-snapshots:
	@$(MAKE) -C movies-service migrate-snapshots

migrate-musics-snapshots:
	@$(MAKE) -C musics-service migrate-snapshots

# ── Phase 4: replay user events → sync snapshots ────────────────────────────
# Publishes user.upserted for every user; consumers INSERT INTO user_snapshots.
# Idempotent — safe to run multiple times.
replay-snapshots:
	@$(MAKE) -C users-service replay

# ── Full setup shortcut ──────────────────────────────────────────────────────
# Convenience alias: run all 4 phases in order.
# Use when setting up from scratch or after a fresh seed.
migrate-all: migrate-main seed-main migrate-snapshots replay-snapshots
	@echo ""
	@echo "✅ Full setup complete"
	@echo "   Phase 1: main tables    ✓"
	@echo "   Phase 2: main data      ✓"
	@echo "   Phase 3: snapshot tables ✓"
	@echo "   Phase 4: user.upserted events published ✓"

# ── migrate-up: legacy alias — runs all migrations without seeding ───────────
migrate-up: migrate-main migrate-snapshots
	@echo "✅ All migrations completed"

# ── migrate-fresh-seeder ─────────────────────────────────────────────────────
# Fresh drop + recreate all databases, then run migrate-all.
migrate-fresh-seeder: migrate-fresh-seeder-auth migrate-fresh-seeder-authz migrate-fresh-seeder-user migrate-fresh-seeder-movie migrate-fresh-seeder-messenger migrate-fresh-seeder-musics seed-user-roles flush-cache migrate-snapshots replay-snapshots
	@echo "✅ All databases recreated, seeded, and snapshots synced"

seed-user-roles:
	@echo "→ seeding user_roles from tumlumtala_users..."
	@docker exec tumlumtala-users-mysql \
		sh -c 'MYSQL_PWD=tala mysql -utumlum -e "\
			INSERT IGNORE INTO tumlumtala_authorization.user_roles (user_uuid, role_id) \
			SELECT uuid, CASE role \
				WHEN '\''administrator'\'' THEN 1 \
				WHEN '\''manager'\'' THEN 2 \
				ELSE 3 \
			END \
			FROM tumlumtala_users.users;"'
	@echo "✅ user_roles seeded"

# replay / replay-user-snapshots — convenience aliases for Phase 4 alone.
replay-user-snapshots: replay-snapshots

replay: replay-snapshots

flush-cache:
	@docker exec tumlumtala-redis redis-cli -a redis_password FLUSHDB 2>/dev/null || true
	@echo "✅ Redis cache flushed"

migrate-fresh-seeder-auth:
	@$(MAKE) -C auth-service migrate-fresh-seeder

migrate-fresh-seeder-authz:
	@$(MAKE) -C authorization-service migrate-fresh-seeder

migrate-fresh-seeder-user:
	@$(MAKE) -C users-service migrate-fresh-seeder

migrate-movie:
	@$(MAKE) -C movies-service migrate-up

migrate-fresh-seeder-movie:
	@$(MAKE) -C movies-service migrate-fresh

migrate-musics:
	@$(MAKE) -C musics-service migrate-up

migrate-fresh-seeder-musics:
	@$(MAKE) -C musics-service migrate-fresh

up-musics: validate-ports
	@$(MAKE) -C musics-service start PORT=$(MUSICS_SERVICE_PORT)

build-musics: validate-ports
	@$(MAKE) -C musics-service up PORT=$(MUSICS_SERVICE_PORT)

start-musics: validate-ports
	@$(MAKE) -C musics-service start PORT=$(MUSICS_SERVICE_PORT)

down-musics:
	@$(MAKE) -C musics-service down

up-messenger: validate-ports
	@$(MAKE) -C messenger-service start PORT=$(MESSENGER_SERVICE_PORT)

build-messenger: validate-ports
	@$(MAKE) -C messenger-service up PORT=$(MESSENGER_SERVICE_PORT)

start-messenger: validate-ports
	@$(MAKE) -C messenger-service start PORT=$(MESSENGER_SERVICE_PORT)

down-messenger:
	@$(MAKE) -C messenger-service down

migrate-messenger:
	@$(MAKE) -C messenger-service migrate-up

migrate-fresh-seeder-messenger:
	@$(MAKE) -C messenger-service migrate-fresh-seeder

migrate-fresh-seeder-messenger-no-upload:
	@$(MAKE) -C messenger-service migrate-fresh-seeder-no-upload

migrate-fresh-seeder-messenger-no-sticker-upload:
	@$(MAKE) -C messenger-service migrate-fresh-seeder-no-sticker-upload

build-proto:
	@$(MAKE) -C contracts build-proto

run-proto:
	@$(MAKE) -C contracts proto

proto: build-proto run-proto

# Usage:
#   make test SERVICE=<service> [FILE=<testfile>]
#
#   make test SERVICE=users-service
#   make test SERVICE=users-service FILE=get_user_test
#
# FILE is the stem of the test file (without _test.go).
# It is converted to a Go -run pattern: get_user_test → -run TestGetUser
SERVICE ?=
FILE    ?=

# Convert snake_case stem to PascalCase: get_user → GetUser
_to_pascal = $(shell echo "$(patsubst %_test,%,$(FILE))" | awk -F_ '{for(i=1;i<=NF;i++) $$i=toupper(substr($$i,1,1)) substr($$i,2); print}' OFS='')

test:
	@if [ -z "$(SERVICE)" ]; then \
		echo "Usage: make test SERVICE=<service> [FILE=<testfile>]"; \
		echo "  Example: make test SERVICE=users-service"; \
		echo "  Example: make test SERVICE=users-service FILE=get_user_test"; \
		exit 1; \
	fi
	@if [ ! -d "$(SERVICE)" ]; then \
		echo "Service not found: $(SERVICE)"; exit 1; \
	fi
	@if [ -n "$(FILE)" ]; then \
		echo "→ Running tests matching Test$(_to_pascal) in $(SERVICE)"; \
		cd "$(SERVICE)" && go test -v -run "Test$(_to_pascal)" ./...; \
	else \
		echo "→ Running all tests in $(SERVICE)"; \
		cd "$(SERVICE)" && go test ./...; \
	fi
