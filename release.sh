#!/bin/bash

set -e

echo "🚀 FOS Printer Release Script"
echo "============================="

# Check if we have uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version: $CURRENT_VERSION"

# Ask for new version
echo ""
echo "What type of release?"
echo "1) Patch (bug fixes) - $CURRENT_VERSION -> $(echo $CURRENT_VERSION | awk -F. '{print $1"."$2"."$3+1}')"
echo "2) Minor (new features) - $CURRENT_VERSION -> $(echo $CURRENT_VERSION | awk -F. '{print $1"."$2+1".0"}')"
echo "3) Major (breaking changes) - $CURRENT_VERSION -> $(echo $CURRENT_VERSION | awk -F. '{print $1+1".0.0"}')"
echo "4) Custom version"
echo ""
read -p "Choose option (1-4): " choice

case $choice in
    1)
        NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{print $1"."$2"."$3+1}')
        ;;
    2)
        NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{print $1"."$2+1".0"}')
        ;;
    3)
        NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{print $1+1".0.0"}')
        ;;
    4)
        read -p "Enter new version: " NEW_VERSION
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🔄 Updating version to $NEW_VERSION..."

# Update package.json version
yarn version $NEW_VERSION --no-git-tag

# Build the executable
echo "📦 Building executable package..."
./build-executable.sh

# Commit changes
git add .
git commit -m "chore: release v$NEW_VERSION"

# Create tag
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# Push changes
echo "🚀 Pushing to GitHub..."
git push origin main
git push origin "v$NEW_VERSION"

echo ""
echo "✅ Release v$NEW_VERSION created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. GitHub Actions will automatically build and deploy"
echo "2. Restaurants can download from: https://your-username.github.io/fos-printer/"
echo "3. Or from GitHub Releases page"
echo ""
echo "�� Happy printing!" 