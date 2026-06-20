COMPOSE_FILE := docker-compose.yml
PORT ?= 25053
export PORT
COMPOSE := docker compose
DB_SERVICE ?= mysql
MIGRATIONS_DIR := migrations
SEEDERS_DIR := seeders

.NOTPARALLEL:

.PHONY: help up start down down-v wait-db migrate-up seed migrate-fresh-seeder

help:
	@echo "auth-service targets: up, start, down, migrate-up, migrate-fresh-seeder"

up:
	@if [ -f "$(COMPOSE_FILE)" ]; then \
		$(COMPOSE) up -d --build; \
	else \
		echo "⚠️  auth-service chưa có docker-compose.yml; skip up"; \
	fi

start:
	@if [ -f "$(COMPOSE_FILE)" ]; then \
		$(COMPOSE) up -d; \
	else \
		echo "⚠️  auth-service chưa có docker-compose.yml; skip start"; \
	fi

down:
	@if [ -f "$(COMPOSE_FILE)" ]; then \
		$(COMPOSE) down --remove-orphans; \
	else \
		echo "⚠️  auth-service chưa có docker-compose.yml; skip down"; \
	fi

down-v:
	@if [ -f "$(COMPOSE_FILE)" ]; then \
		$(COMPOSE) down -v --remove-orphans; \
	else \
		echo "⚠️  auth-service chưa có docker-compose.yml; skip down-v"; \
	fi

wait-db:
	@if [ -f "$(COMPOSE_FILE)" ]; then \
		$(COMPOSE) up -d --wait $(DB_SERVICE); \
	else \
		echo "⚠️  auth-service chưa có docker-compose.yml; skip wait-db"; \
	fi

migrate-up: wait-db
	@if [ ! -f "$(COMPOSE_FILE)" ]; then \
		echo "⚠️  auth-service chưa được triển khai; skip migrate"; \
	else \
		set -e; found=0; \
		for file in $$(find "$(MIGRATIONS_DIR)" -maxdepth 1 -type f -name '*.sql' 2>/dev/null | sort); do \
			found=1; echo "→ migrate $$file"; \
			$(COMPOSE) exec -T $(DB_SERVICE) sh -c 'MYSQL_PWD="$$MYSQL_PASSWORD" mysql -u"$$MYSQL_USER" "$$MYSQL_DATABASE"' < "$$file"; \
		done; \
		if [ "$$found" -eq 0 ]; then echo "No auth migrations found"; fi; \
	fi

seed: wait-db
	@if [ ! -f "$(COMPOSE_FILE)" ]; then \
		echo "⚠️  auth-service chưa được triển khai; skip seed"; \
	else \
		set -e; found=0; \
		for file in $$(find "$(SEEDERS_DIR)" -maxdepth 1 -type f -name '*.sql' 2>/dev/null | sort); do \
			found=1; echo "→ seed $$file"; \
			echo "──────────────── SQL ────────────────"; \
			sed -n '1,$$p' "$$file"; \
			echo "────────────── END SQL ──────────────"; \
			$(COMPOSE) exec -T $(DB_SERVICE) sh -c 'MYSQL_PWD="$$MYSQL_PASSWORD" mysql -u"$$MYSQL_USER" "$$MYSQL_DATABASE"' < "$$file"; \
		done; \
		if [ "$$found" -eq 0 ]; then echo "No auth seeders found"; fi; \
	fi

migrate-fresh-seeder: down-v wait-db migrate-up seed
	@echo "✅ auth-service fresh/seed workflow completed"
