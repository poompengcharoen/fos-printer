#!/bin/bash

set -e

echo "🖨️ Building FOS Printer Executable"
echo "=================================="

# Build TypeScript
echo "📦 Building TypeScript..."
yarn build

# Create the executable directory
echo "📁 Creating executable package..."
mkdir -p fos-printer-app

# Copy the built files
cp -r dist fos-printer-app/
cp package.json fos-printer-app/

# Create the main executable script
cat > fos-printer-app/fos-printer << 'EOF'
#!/usr/bin/env node

// FOS Printer Executable
const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Run the app
require("./dist/app.js");
EOF

# Make it executable
chmod +x fos-printer-app/fos-printer

# Create a simple installer script
cat > fos-printer-app/install.sh << 'EOF'
#!/bin/bash

echo "🖨️ Installing FOS Printer..."

# Install dependencies
echo "📦 Installing dependencies..."
if command -v yarn &> /dev/null; then
    yarn install --production
elif command -v npm &> /dev/null; then
    echo "⚠️  Yarn not found, using npm instead"
    npm install --production
else
    echo "❌ Neither yarn nor npm found!"
    echo "Please install Node.js and npm first:"
    echo "  https://nodejs.org/"
    exit 1
fi

# Copy to /usr/local/bin (or ~/.local/bin if no write access)
INSTALL_DIR="/usr/local/bin"
if [ ! -w "$INSTALL_DIR" ]; then
    INSTALL_DIR="$HOME/.local/bin"
    mkdir -p "$INSTALL_DIR"
fi

# Copy the executable
cp fos-printer "$INSTALL_DIR/"
echo "✅ FOS Printer installed to $INSTALL_DIR/fos-printer"

# Create template .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating template .env file..."
    cat > .env << 'ENV_EOF'
# FOS Printer Configuration
# Update these values with your actual settings

# Backend API URL
BACKEND_URL=http://localhost:3000

# Restaurant ID
RESTAURANT_ID=your-restaurant-id

# Printer settings (optional)
# PRINTER_NAME=your-printer-name
# PRINTER_PORT=your-printer-port

# Logging level (debug, info, warn, error)
LOG_LEVEL=info
ENV_EOF
    echo "✅ Template .env file created"
    echo "⚠️  Please update the .env file with your actual settings"
else
    echo "ℹ️  .env file already exists, skipping template creation"
fi

echo "🎉 Installation complete!"
echo "Run 'fos-printer' to start the application"
EOF

chmod +x fos-printer-app/install.sh

# Create README
cat > fos-printer-app/README.md << 'EOF'
# FOS Printer

A standalone executable for the Food Order System printer service.

## Installation

1. Run the installer:
   ```bash
   ./install.sh
   ```

2. Configure the application by updating the `.env` file (created automatically):
   ```bash
   BACKEND_URL=http://your-backend-url.com
   RESTAURANT_ID=your-restaurant-id
   ```

3. Start the application:
   ```bash
   fos-printer
   ```

## Manual Installation

If you prefer to install manually:

1. Install dependencies: `yarn install --production` (or `npm install --production` if yarn is not available)
2. Copy `fos-printer` to a directory in your PATH (e.g., `/usr/local/bin/`)
3. Create a `.env` file with your configuration
4. Run `fos-printer`

## Prerequisites

- Node.js and npm (or yarn) must be installed
- Download from: https://nodejs.org/

## Troubleshooting

- Make sure your USB printer is connected
- Check that the backend URL is correct
- Verify your restaurant ID is set correctly
EOF

# Create zip file for easy distribution
echo "📦 Creating zip package..."
zip -r fos-printer-app.zip fos-printer-app/

echo "✅ Executable package created in fos-printer-app/"
echo "✅ Zip package created: fos-printer-app.zip"
echo ""
echo "📋 Next steps:"
echo "1. Download fos-printer-app.zip"
echo "2. Extract and run ./install.sh on the target machine"
echo "3. Configure .env file with your settings"
echo "4. Run fos-printer to start" 