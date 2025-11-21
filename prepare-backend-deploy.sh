#!/bin/bash

# Backend Deployment Helper Script
# This script helps you prepare for backend deployment

echo "🚀 Backend Deployment Preparation"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -d "server" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Found server directory"
echo ""

# Check if server/.env exists
if [ ! -f "server/.env" ]; then
    echo "⚠️  Warning: server/.env not found"
    echo "   Creating from template..."
    cp server/.env.template server/.env
    echo "   Please edit server/.env with your actual credentials"
    echo ""
fi

# Build server
echo "📦 Building server..."
cd server
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Server build successful"
else
    echo "❌ Server build failed"
    exit 1
fi

cd ..

echo ""
echo "✨ Preparation complete!"
echo ""
echo "Next steps:"
echo "1. Create a GitHub repository for your backend"
echo "2. Push the server/ folder to GitHub:"
echo "   git init"
echo "   git add server/"
echo "   git commit -m 'Backend for deployment'"
echo "   git remote add origin https://github.com/dareyno4/luminousrehab-demo-backend"
echo "   git push -u origin main"
echo ""
echo "3. Deploy on Render.com or Railway.app (see BACKEND-DEPLOYMENT.md)"
echo ""
echo "4. After deployment, update .env.production with your backend URL"
echo ""
