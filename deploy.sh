#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# 1ONLYSARKAR - AUTOMATED DEPLOYMENT SCRIPT (BASH)
# This script builds the Docker image, pushes it to Docker Hub, and triggers
# the Dockploy webhook for automated deployment.
# ─────────────────────────────────────────────────────────────────────────────

set -e

# Configuration
IMAGE_NAME="1onlysarkar/freefire:latest"
WEBHOOK_URL="https://host.1onlysarkar.shop/api/deploy/7z6BZRVqUXgyIA9-LDuQh"

echo -e "\033[0;36m🚀 [1/3] Building Docker image: $IMAGE_NAME...\033[0m"
docker build --build-arg NEXT_PUBLIC_APP_URL="https://1onlysarkar.shop" -t "$IMAGE_NAME" .

echo -e "\n\033[0;36m📤 [2/3] Pushing Docker image to registry...\033[0m"
docker push "$IMAGE_NAME"

echo -e "\n\033[0;36m🔔 [3/3] Triggering Dockploy automatic deployment...\033[0m"
if curl -X POST -s -f "$WEBHOOK_URL" > /dev/null; then
    echo -e "\033[0;32m✅ Deployment successfully triggered! Dockploy is now rebuilding your container.\033[0m"
else
    echo -e "\033[0;31m❌ Failed to trigger deployment webhook.\033[0m"
    exit 1
fi
