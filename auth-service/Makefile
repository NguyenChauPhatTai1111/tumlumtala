COMPOSE_FILE := docker-compose.yml
PORT ?= 25053
export PORT
COMPOSE := docker compose
DEV_COMPOSE := $(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml

.NOTPARALLEL:

.PHONY: help up start dev down migrate-up migrate-fresh-seeder

help:
	@echo "auth-service targets: up, start, dev, down, migrate-up, migrate-fresh-seeder"

up:
	@$(COMPOSE) up -d --build

start:
	@$(COMPOSE) up -d

dev:
	@$(DEV_COMPOSE) up -d --build

down:
	@$(COMPOSE) down --remove-orphans

wait-db:
	@$(MAKE) -C ../users-service wait-db

migrate-up:
	@echo "auth-service: no migrations (shares tumlumtala_users DB)"

migrate-fresh-seeder:
	@echo "auth-service: no fresh/seed (shares tumlumtala_users DB)"
