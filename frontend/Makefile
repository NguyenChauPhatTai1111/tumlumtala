-include .env

.PHONY: dev build up down

dev:
	npm run dev

build:
	docker compose up -d --build

up:
	docker compose up -d

down:
	docker compose down --remove-orphans
