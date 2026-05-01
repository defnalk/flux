.PHONY: help data data-force test-etl test-web web dev lint typecheck clean

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*?##/ {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

data: ## Refresh web/data/flux.sqlite + eu_ets.csv from EMBER + seed
	cd etl && uv sync --extra dev && uv run python build.py

data-force: ## Force re-download EMBER, ignoring cache
	cd etl && uv sync --extra dev && uv run python build.py --force --verbose

test-etl: ## Run pytest in etl/
	cd etl && uv sync --extra dev && uv run pytest

test-web: ## Run vitest in web/
	cd web && npm test --silent

web: dev ## Alias for dev

dev: ## Start the Next.js dev server
	cd web && npm run dev

lint: ## Lint web/
	cd web && npm run lint

typecheck: ## Typecheck web/
	cd web && npx tsc --noEmit

clean: ## Remove build artefacts and caches
	rm -rf web/.next web/node_modules/.cache etl/.cache etl/.venv
