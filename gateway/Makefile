COMPOSE := docker compose

.PHONY: help up start down test build

help:
	@echo "  make up      Build và start gateway"
	@echo "  make start   Start gateway"
	@echo "  make down    Stop gateway"
	@echo "  make test    Chạy gateway tests"
	@echo "  make build   Build gateway image"

up:
	@$(COMPOSE) up -d --build

start:
	@$(COMPOSE) up -d

down:
	@$(COMPOSE) down --remove-orphans

test:
	@go test ./...

build:
	@$(COMPOSE) build gateway
