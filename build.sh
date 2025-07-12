#!/bin/bash

# Food Order Printer Build Script
# This script automates the build process for creating desktop executables

set -e

echo "🖨️ Food Order Printer - Build Script"
echo "====================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Yarn is installed
if ! command -v yarn &> /dev/null; then
    echo "❌ Yarn is not installed. Please install Yarn first."
    exit 1
fi

echo "✅ Node.js and Yarn found"

# Install dependencies
echo "📦 Installing dependencies..."
yarn install

# Build TypeScript
echo "🔨 Building TypeScript..."
yarn build

# Check if build was successful
if [ ! -f "dist/app.js" ]; then
    echo "❌ Build failed. dist/app.js not found."
    exit 1
fi

echo "✅ TypeScript build successful"

# Determine platform
PLATFORM=${1:-"all"}

case $PLATFORM in
    "mac"|"macos")
        echo "🍎 Building for macOS..."
        yarn dist --mac
        ;;
    "win"|"windows")
        echo "🪟 Building for Windows..."
        yarn dist --win
        ;;
    "linux")
        echo "🐧 Building for Linux..."
        yarn dist --linux
        ;;
    "all"|*)
        echo "🌍 Building for all platforms..."
        yarn dist
        ;;
esac

echo "✅ Build completed successfully!"
echo ""
echo "📁 Executables are available in the 'release' folder:"
ls -la release/ 2>/dev/null || echo "No release folder found. Check for build errors."

echo ""
echo "🎉 Build process completed!"
echo "Users can now install and run the application without needing to install Node.js or run commands." 