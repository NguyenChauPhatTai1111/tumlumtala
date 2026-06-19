.PHONY: build-proto run-proto proto

build-proto:
	cd contracts && make build-proto

run-proto:
	cd contracts && make proto

proto:
	cd contracts && make build-proto
	cd contracts && make proto