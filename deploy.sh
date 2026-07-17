#!/bin/bash
# AI Sales Operations Manager App Service Deployment Script
echo "==============================================="
echo "🚀 Updating and Deploying Flow Backend to Azure"
echo "==============================================="

# 1. Pull latest commits
echo "📥 Pulling latest git updates..."
git pull

# 2. Package backend
echo "📦 Packaging backend files (excluding virtual environment and local databases)..."
cd backend
zip -r deploy.zip . -x "venv/*" -x "*.db" -x "deploy.zip"

# 3. Deploy to Azure Web App
echo "☁️ Deploying to Azure App Service: flow-backend-api..."
az webapp deploy --resource-group flow-sales-rg --name flow-backend-api --src-path deploy.zip

echo "==============================================="
echo "✨ Deployment complete! Health status: https://flow-backend-api.azurewebsites.net/health"
echo "==============================================="
cd ..
