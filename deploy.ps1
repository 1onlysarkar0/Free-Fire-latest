# =============================================================================
# 1ONLYSARKAR - AUTOMATED DEPLOYMENT SCRIPT
# This script builds the Docker image, pushes it to Docker Hub, and triggers
# the Dockploy webhook for automated deployment.
# =============================================================================

$ErrorActionPreference = "Stop"

# Configuration
$IMAGE_NAME = "1onlysarkar/freefire:latest"
$WEBHOOK_URL = "https://host.1onlysarkar.shop/api/deploy/vutZvAEH_roRtOfuIk7mI"

Write-Host "[1/3] Building Docker image: $IMAGE_NAME..." -ForegroundColor Cyan
docker build -t $IMAGE_NAME .

Write-Host "`n[2/3] Pushing Docker image to registry..." -ForegroundColor Cyan
docker push $IMAGE_NAME

Write-Host "`n[3/3] Triggering Dockploy automatic deployment..." -ForegroundColor Cyan
try {
    # Send a POST request to Dockploy to trigger the deployment
    $Response = Invoke-RestMethod -Uri $WEBHOOK_URL -Method Post
    Write-Host "[SUCCESS] Deployment successfully triggered! Dockploy is now rebuilding your container." -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Failed to trigger deployment webhook." -ForegroundColor Red
    Write-Error $_
}
