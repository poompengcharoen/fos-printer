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
npm install --production

# Copy to /usr/local/bin (or ~/.local/bin if no write access)
INSTALL_DIR="/usr/local/bin"
if [ ! -w "$INSTALL_DIR" ]; then
    INSTALL_DIR="$HOME/.local/bin"
    mkdir -p "$INSTALL_DIR"
fi

# Copy the executable
cp fos-printer "$INSTALL_DIR/"
echo "✅ FOS Printer installed to $INSTALL_DIR/fos-printer"

# Create desktop shortcut (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📱 Creating desktop shortcut..."
    cat > ~/Desktop/FOS\ Printer.command << 'DESKTOP_EOF'
#!/bin/bash
cd "$(dirname "$0")"
/usr/local/bin/fos-printer
DESKTOP_EOF
    chmod +x ~/Desktop/FOS\ Printer.command
    echo "✅ Desktop shortcut created"
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

2. Configure the application by creating a `.env` file:
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

1. Install dependencies: `npm install --production`
2. Copy `fos-printer` to a directory in your PATH (e.g., `/usr/local/bin/`)
3. Create a `.env` file with your configuration
4. Run `fos-printer`

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