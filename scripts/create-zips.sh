#!/bin/bash

# Create zip files for local testing
# Usage: ./scripts/create-zips.sh [linux]
# If 'linux' is passed, only zip the AppImage and create version.json for Linux

MODE=$1

if [ "$MODE" = "linux" ]; then
  echo "[Linux-only] Creating zip for Food Order Printer Linux..."
  if [ ! -d "release" ]; then
    echo "Error: release directory not found. Please run 'yarn electron:build:linux' first."
    exit 1
  fi
  cd release
  if [ -f "Food Order Printer-1.0.0-arm64.AppImage" ]; then
    zip -r ../fos-printer-linux.zip "Food Order Printer-1.0.0-arm64.AppImage"
    echo "✅ fos-printer-linux.zip created"
  else
    echo "⚠️  Linux AppImage not found"
  fi
  echo "Creating version.json..."
  echo '{
  "version": "1.0.0",
  "buildDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "commit": "local-build"
}' > ../version.json
  echo "✅ version.json created"
  cd ..
  echo "🎉 Linux zip and version.json created!"
  ls -la fos-printer-linux.zip version.json 2>/dev/null || echo "No files found in current directory"
  exit 0
fi

echo "Creating zip files for Food Order Printer..."

# Check if release directory exists
if [ ! -d "release" ]; then
    echo "Error: release directory not found. Please run 'yarn electron:build:all' first."
    exit 1
fi

cd release

# Create platform-specific zip files
echo "Creating fos-printer-mac.zip..."
if [ -f "Food Order Printer-1.0.0-arm64.dmg" ]; then
    zip -r ../fos-printer-mac.zip "Food Order Printer-1.0.0-arm64.dmg"
    echo "✅ fos-printer-mac.zip created"
else
    echo "⚠️  macOS DMG not found"
fi

echo "Creating fos-printer-win.zip..."
if [ -f "Food Order Printer Setup 1.0.0.exe" ]; then
    zip -r ../fos-printer-win.zip "Food Order Printer Setup 1.0.0.exe"
    echo "✅ fos-printer-win.zip created"
else
    echo "⚠️  Windows EXE not found"
fi

echo "Creating fos-printer-linux.zip..."
if [ -f "Food Order Printer-1.0.0-arm64.AppImage" ]; then
    zip -r ../fos-printer-linux.zip "Food Order Printer-1.0.0-arm64.AppImage"
    echo "✅ fos-printer-linux.zip created"
else
    echo "⚠️  Linux AppImage not found"
fi

# Create all-platforms zip
echo "Creating fos-printer-app.zip..."
zip -r ../fos-printer-app.zip "Food Order Printer-1.0.0-arm64.dmg" "Food Order Printer Setup 1.0.0.exe" "Food Order Printer-1.0.0-arm64.AppImage" 2>/dev/null || true
echo "✅ fos-printer-app.zip created"

# Create version.json for testing
echo "Creating version.json..."
echo '{
  "version": "1.0.0",
  "buildDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "commit": "local-build"
}' > ../version.json

echo "✅ version.json created"

cd ..

echo "🎉 All zip files created successfully!"
echo "Files created:"
ls -la fos-printer-*.zip version.json 2>/dev/null || echo "No files found in current directory" 