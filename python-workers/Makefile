.PHONY: up down restart logs ps prune build help

# Start all workers in background
up:
	docker compose up -d

# Start all workers and rebuild images
build:
	docker compose up -d --build

# Stop and remove containers
down:
	docker compose down

# Restart all workers
restart:
	docker compose restart

# View follow logs
logs:
	docker compose logs -f

# Check status of containers
ps:
	docker compose ps

# Clean up unused images/volumes
prune:
	docker image prune -f

# Show help
help:
	@echo "Available commands:"
	@echo "  make up      - Start workers in background"
	@echo "  make build   - Rebuild and start workers"
	@echo "  make down    - Stop workers"
	@echo "  make restart - Restart workers"
	@echo "  make logs    - View real-time logs"
	@echo "  make ps      - Check container status"
	@echo "  make prune   - Clean up Docker history"
