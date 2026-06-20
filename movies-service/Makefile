COMPOSE := docker compose
PORT ?= 25055
export PORT
MYSQL_CONTAINER := tumlumtala-users-mysql
DATABASE_NAME ?= tumlumtala_movies
DATABASE_USER ?= tumlum
DATABASE_PASSWORD ?= tala
DATABASE_ROOT_PASSWORD ?= root
MIGRATIONS_DIR := internal/infrastructure/db/migrations

.NOTPARALLEL:

.PHONY: help up start down wait-db ensure-db fresh-db migrate-up migrate-fresh build

help:
	@echo "  make up                     Build và start movies-service"
	@echo "  make start                  Start movies-service (không build lại)"
	@echo "  make down                   Stop movies-service"
	@echo "  make migrate-up             Chạy tất cả SQL migrations"
	@echo "  make migrate-fresh          Xóa DB, migrate lại"

up: migrate-up
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

migrate-up: ensure-db
	@set -e; found=0; \
	for file in $$(find "$(MIGRATIONS_DIR)" -maxdepth 1 -type f -name '*.sql' | sort); do \
		found=1; \
		echo "→ migrate $$file"; \
		docker exec -i \
			-e MYSQL_DATABASE="$(DATABASE_NAME)" \
			-e MYSQL_USER="$(DATABASE_USER)" \
			-e MYSQL_PASSWORD="$(DATABASE_PASSWORD)" \
			$(MYSQL_CONTAINER) sh -c 'MYSQL_PWD="$$MYSQL_PASSWORD" mysql -u"$$MYSQL_USER" "$$MYSQL_DATABASE"' < "$$file"; \
	done; \
	if [ "$$found" -eq 0 ]; then echo "No movies migrations found"; fi
	@echo "✅ movies-service migrated"

migrate-fresh: fresh-db migrate-up
	@echo "✅ movies-service database recreated"

build:
	@$(COMPOSE) build movies-service
