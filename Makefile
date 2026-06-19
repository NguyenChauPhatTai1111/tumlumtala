.PHONY: build-proto run-proto proto start-dev start-auth start-infr

build-proto:
	cd contracts && make build-proto

run-proto:
	cd contracts && make proto

proto:
	cd contracts && make build-proto
	cd contracts && make proto

network:
	docker network create tumlumtala-net

start-infr:
	cd infra && docker compose up -d
	"✅ Infra started"

start-auth:
	cd auth-service && docker compose up -d
	"✅ auth started"

start-dev:
	start-infr start-auth
	@echo "✅ Development environment started"
