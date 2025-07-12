# Food Order Printer - Desktop Application

A desktop application for connecting receipt printers to the Food Order System. This application allows non-technical users to easily start and manage the printer service with a simple GUI.

## Features

- 🖨️ Simple desktop interface for printer management
- 🔌 Easy USB printer connection
- 🏪 Restaurant ID configuration
- 🌐 Backend URL configuration
- 📊 Real-time status monitoring
- 📝 Live log output
- 🚀 One-click start/stop functionality

## Prerequisites

- Node.js 18+ installed on the target machine
- USB receipt printer connected
- Network access to the backend server

## Building the Application

### For Developers

1. **Install dependencies:**

   ```bash
   yarn install
   ```

2. **Build the application:**

   ```bash
   yarn build
   ```

3. **Create desktop executable:**
   ```bash
   yarn dist
   ```

### Build Options

- **Development mode:** `yarn electron:dev`
- **Package for distribution:** `yarn pack`
- **Create installer:** `yarn dist`

## Distribution

After running `yarn dist`, the executable will be created in the `release` folder:

- **macOS:** `.dmg` file
- **Windows:** `.exe` installer
- **Linux:** `.AppImage` file

## Usage for End Users

### Installation

1. Download the appropriate executable for your operating system
2. Run the installer (Windows) or mount the DMG (macOS)
3. Follow the installation wizard

### First Time Setup

1. **Connect your USB receipt printer** to the computer
2. **Double-click** the Food Order Printer application
3. **Enter your Restaurant ID** (provided by your system administrator)
4. **Enter the Backend URL** (usually `http://localhost:3000` or your server URL)
5. **Click "Start Printer"** to begin receiving orders

### Daily Usage

1. **Launch the application**
2. **Verify your Restaurant ID** is correct
3. **Click "Start Printer"**
4. **Monitor the status** - the green indicator shows the printer is connected
5. **Check the logs** for any issues or order confirmations
6. **Click "Stop Printer"** when done for the day

## Troubleshooting

### Printer Not Detected

1. Ensure the USB printer is properly connected
2. Check that the printer drivers are installed
3. Try disconnecting and reconnecting the printer
4. Restart the application

### Connection Issues

1. Verify the Backend URL is correct
2. Check your network connection
3. Ensure the backend server is running
4. Contact your system administrator

### Application Won't Start

1. Check that Node.js is installed
2. Verify you have the correct version for your operating system
3. Try running as administrator (Windows)
4. Check system logs for error messages

## Technical Details

### Architecture

- **Electron:** Desktop application framework
- **TypeScript:** Type-safe JavaScript
- **Socket.IO:** Real-time communication with backend
- **ESC/POS:** Printer communication protocol

### File Structure

```
fos-printer/
├── src/
│   ├── electron/
│   │   └── main.ts          # Electron main process
│   ├── renderer/
│   │   └── index.html       # User interface
│   ├── socket/
│   │   ├── printerClient.ts # Socket client
│   │   └── socketInstance.ts
│   ├── services/
│   │   └── printerService.ts
│   ├── types/
│   └── app.ts              # Main printer application
├── dist/                   # Compiled JavaScript
├── release/               # Built executables
└── package.json
```

### Environment Variables

The application creates a `.env.local` file with:

- `RESTAURANT_ID`: Your restaurant identifier
- `BACKEND_URL`: Backend server URL

## Support

For technical support or issues:

1. Check the application logs
2. Verify your configuration
3. Contact your system administrator
4. Check the troubleshooting section above

## Development

### Adding Features

1. Modify the HTML interface in `src/renderer/index.html`
2. Update the main process in `src/electron/main.ts`
3. Add new IPC handlers for communication
4. Test thoroughly before distribution

### Building for Different Platforms

- **macOS:** `yarn dist --mac`
- **Windows:** `yarn dist --win`
- **Linux:** `yarn dist --linux`

## License

This application is part of the Food Order System and follows the same licensing terms.
