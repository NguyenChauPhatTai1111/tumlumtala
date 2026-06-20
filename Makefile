-include .env

SERVICES := auth-service users-service

# Service port registry. Every new service must reserve one unique TCP port
# here before being added to the orchestration targets.
USER_SERVICE_PORT ?= 25052
AUTH_SERVICE_PORT ?= 25053
PRODUCTS_SERVICE_PORT ?= 25054
SERVICE_PORTS := $(USER_SERVICE_PORT) $(AUTH_SERVICE_PORT) $(PRODUCTS_SERVICE_PORT)

.NOTPARALLEL:

.PHONY: help ports validate-ports dev down up start network \
	start-infra up-infra down-infra \
	start-auth up-auth down-auth \
	start-user up-user down-user \
	migrate-up migrate-auth migrate-user \
	migrate-fresh-seeder migrate-fresh-seeder-auth migrate-fresh-seeder-user \
	proto build-proto run-proto

help:
	@echo "Development:"
	@echo "  make dev                         Down, up và start toàn bộ hệ thống"
	@echo "  make start-auth                  Start auth-service"
	@echo "  make start-user                  Start users-service"
	@echo "  make down                        Stop toàn bộ hệ thống"
	@echo "Migrations:"
	@echo "  make migrate-up                  Migrate tất cả service"
	@echo "  make migrate-auth                Migrate auth-service"
	@echo "  make migrate-user                Migrate users-service"
	@echo "  make migrate-fresh-seeder        Fresh database và seed tất cả service"
	@echo "  make migrate-fresh-seeder-auth   Fresh/seed auth-service"
	@echo "  make migrate-fresh-seeder-user   Fresh/seed users-service"
	@echo "Ports:"
	@echo "  users-service=$(USER_SERVICE_PORT), auth-service=$(AUTH_SERVICE_PORT), products-service=$(PRODUCTS_SERVICE_PORT)"

ports:
	@echo "users-service    $(USER_SERVICE_PORT)"
	@echo "auth-service     $(AUTH_SERVICE_PORT)"
	@echo "products-service $(PRODUCTS_SERVICE_PORT) (reserved)"

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

# Full reset requested for local development. `up` creates containers; `start`
# is kept as a separate phase so stopped existing containers are also covered.
dev: validate-ports down up start
	@echo "✅ Development environment is ready"

down: down-auth down-user down-infra

up: network up-infra up-auth up-user

start: start-infra start-auth start-user

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
	@$(MAKE) -C auth-service up PORT=$(AUTH_SERVICE_PORT)

start-auth: validate-ports
	@$(MAKE) -C auth-service start PORT=$(AUTH_SERVICE_PORT)

down-auth:
	@$(MAKE) -C auth-service down

up-user: validate-ports
	@$(MAKE) -C users-service up PORT=$(USER_SERVICE_PORT)

start-user: validate-ports
	@$(MAKE) -C users-service start PORT=$(USER_SERVICE_PORT)

down-user:
	@$(MAKE) -C users-service down

migrate-up: migrate-auth migrate-user
	@echo "✅ All migrations completed"

migrate-auth:
	@$(MAKE) -C auth-service migrate-up

migrate-user:
	@$(MAKE) -C users-service migrate-up

migrate-fresh-seeder: migrate-fresh-seeder-auth migrate-fresh-seeder-user
	@echo "✅ All databases recreated and seeded"

migrate-fresh-seeder-auth:
	@$(MAKE) -C auth-service migrate-fresh-seeder

migrate-fresh-seeder-user:
	@$(MAKE) -C users-service migrate-fresh-seeder

build-proto:
	@$(MAKE) -C contracts build-proto

run-proto:
	@$(MAKE) -C contracts proto

proto: build-proto run-proto
