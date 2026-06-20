COMPOSE_FILE := docker-compose.yml
PORT ?= 25053
export PORT
COMPOSE := docker compose
INFRA_COMPOSE := docker compose -f ../infra/docker-compose.yml
MYSQL_CONTAINER := tumlumtala-mysql

.NOTPARALLEL:

.PHONY: help up start down migrate-up migrate-fresh-seeder

help:
	@echo "auth-service targets: up, start, down, migrate-up, migrate-fresh-seeder"

up:
	@$(COMPOSE) up -d --build

start:
	@$(COMPOSE) up -d

down:
	@$(COMPOSE) down --remove-orphans

wait-db:
	@$(INFRA_COMPOSE) up -d --wait mysql

migrate-up:
	@echo "auth-service: no migrations (shares tumlumtala_users DB)"

migrate-fresh-seeder:
	@echo "auth-service: no fresh/seed (shares tumlumtala_users DB)"
