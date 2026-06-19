.PHONY: build-proto proto run

build-proto:
	@echo "Building proto image..."
	@docker compose build proto-gen
	@echo "✅ Build complete"

proto:
	@echo "Generating protobuf files..."
	@docker compose run --rm proto-gen
	@echo "✅ Generate complete"

run:
	@echo "Running proto generator..."
	@docker compose run --rm proto-gen
	@echo "✅ Run complete"