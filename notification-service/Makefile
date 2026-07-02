COMPOSE := docker compose
DEV_COMPOSE := $(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: help up start dev down

help:
	@echo "  make up      Build và start notification API/worker"
	@echo "  make start   Start notification API/worker"
	@echo "  make dev     Start API/worker với Air hot reload"
	@echo "  make down    Stop notification API/worker"

up:
	@$(COMPOSE) up -d --build

start:
	@$(COMPOSE) up -d

dev:
	@$(DEV_COMPOSE) up -d --build

down:
	@$(COMPOSE) down --remove-orphans
