COMPOSE := docker compose
DEV_COMPOSE := $(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: help up start dev down test build

help:
	@echo "  make up      Build và start gateway"
	@echo "  make start   Start gateway"
	@echo "  make dev     Start với Air hot reload"
	@echo "  make down    Stop gateway"
	@echo "  make test    Chạy gateway tests"
	@echo "  make build   Build gateway image"

up:
	@$(COMPOSE) up -d --build

start:
	@$(COMPOSE) up -d

dev:
	@$(DEV_COMPOSE) up -d --build

down:
	@$(COMPOSE) down --remove-orphans

test:
	@go test ./...

build:
	@$(COMPOSE) build gateway
