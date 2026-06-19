.PHONY: build-proto proto run

build-proto:
	@echo "Building proto image..."
	@docker compose build proto-gen
	@echo "✅ Build complete"

proto:
	@echo "Generating protobuf files..."
	@docker compose run --rm proto-gen
	@echo "✅ Generate complete"
