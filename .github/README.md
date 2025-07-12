# GitHub Actions Workflow Documentation

## Build and Release Workflow

This workflow automatically builds the Food Order Printer application for multiple platforms and deploys the executables to GitHub Pages.

### Triggering the Workflow

The workflow is triggered by:

1. **Tag Push**: Push a tag starting with `v` (e.g., `v1.0.0`, `v2.1.3`)
2. **Manual Trigger**: Use the "workflow_dispatch" trigger in GitHub Actions

### What the Workflow Does

1. **Build Phase**:

   - Builds the application for macOS, Windows, and Linux simultaneously
   - Uses matrix strategy to run on multiple platforms
   - Creates platform-specific executables using electron-builder

2. **Package Phase**:

   - Downloads all build artifacts
   - Creates zip files for each platform
   - Creates a combined zip with all platforms
   - Copies the download page to the distribution folder
   - Creates version information

3. **Deploy Phase**:
   - Deploys files to GitHub Pages
   - Creates a GitHub Release with all executables
   - Makes downloads available at: `https://poompengcharoen.github.io/fos-printer/`

### Generated Files

After a successful run, the following files will be available:

- `fos-printer-app.zip` - Complete package with all platform executables
- `fos-printer-mac.zip` - macOS executable (.dmg)
- `fos-printer-win.zip` - Windows executable (.exe)
- `fos-printer-linux.zip` - Linux executable (.AppImage)
- `index.html` - Download page
- `version.json` - Version information

### Download URLs

Once deployed, users can download the application from:

- **Main Download Page**: https://poompengcharoen.github.io/fos-printer/
- **All Platforms**: https://poompengcharoen.github.io/fos-printer/fos-printer-app.zip
- **macOS**: https://poompengcharoen.github.io/fos-printer/fos-printer-mac.zip
- **Windows**: https://poompengcharoen.github.io/fos-printer/fos-printer-win.zip
- **Linux**: https://poompengcharoen.github.io/fos-printer/fos-printer-linux.zip

### Setup Requirements

1. **GitHub Pages**: Enable GitHub Pages in repository settings

   - Go to Settings > Pages
   - Source: "GitHub Actions"

2. **Repository Permissions**: Ensure the workflow has permission to:
   - Create releases
   - Deploy to GitHub Pages
   - Upload artifacts

### Manual Release Process

To create a new release:

1. Update version in `package.json` if needed
2. Commit and push changes
3. Create and push a new tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. The workflow will automatically trigger and build the release

### Troubleshooting

- **Build Failures**: Check the Actions tab for detailed error logs
- **Missing Files**: Ensure all required files are committed before tagging
- **Permission Issues**: Verify repository settings and workflow permissions
