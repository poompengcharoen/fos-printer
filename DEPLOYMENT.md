# 🚀 FOS Printer Deployment Guide

This guide explains how to set up automated builds and distribution for the FOS Printer application.

## 📋 Overview

The deployment system consists of:

- **GitHub Actions** for automated builds
- **GitHub Pages** for hosting downloads
- **GitHub Releases** for versioned distributions
- **Automated release script** for easy versioning

## 🛠️ Setup Instructions

### 1. Enable GitHub Pages

1. Go to your repository settings
2. Navigate to "Pages" section
3. Set source to "GitHub Actions"
4. Save the settings

### 2. Enable GitHub Actions

1. Go to "Actions" tab in your repository
2. The workflows will be automatically detected
3. No additional setup needed

### 3. Configure Repository Secrets (Optional)

For advanced features, you can add these secrets:

- `NPM_TOKEN` - For publishing to npm (if needed)
- `DISCORD_WEBHOOK` - For Discord notifications

## 🚀 Release Process

### Automated Release (Recommended)

1. **Make your changes** and commit them
2. **Run the release script:**
   ```bash
   ./release.sh
   ```
3. **Choose release type:**
   - Patch (bug fixes)
   - Minor (new features)
   - Major (breaking changes)
   - Custom version

The script will:

- ✅ Update version in `package.json`
- ✅ Build the executable package
- ✅ Commit and tag the release
- ✅ Push to GitHub
- ✅ Trigger GitHub Actions

### Manual Release

1. **Update version:**

   ```bash
   yarn version patch  # or minor/major
   ```

2. **Build package:**

   ```bash
   ./build-executable.sh
   ```

3. **Commit and tag:**
   ```bash
   git add .
   git commit -m "chore: release v1.0.1"
   git tag -a "v1.0.1" -m "Release v1.0.1"
   git push origin main
   git push origin "v1.0.1"
   ```

## 📦 Distribution Options

### Option 1: GitHub Pages (Automatic)

**URL:** `https://your-username.github.io/fos-printer/`

**Features:**

- ✅ Automatic deployment on every push to main
- ✅ Simple download page
- ✅ Always latest version
- ✅ No authentication required

**For Restaurants:**

1. Visit the URL
2. Download the package
3. Run `./install.sh`
4. Configure and start

### Option 2: GitHub Releases (Versioned)

**URL:** `https://github.com/your-username/fos-printer/releases`

**Features:**

- ✅ Versioned releases
- ✅ Release notes
- ✅ Multiple platform builds
- ✅ Download statistics

**For Restaurants:**

1. Go to Releases page
2. Download latest version
3. Extract and run `./install.sh`

### Option 3: Direct Repository Access

**URL:** `https://github.com/your-username/fos-printer`

**Features:**

- ✅ Source code access
- ✅ Issue tracking
- ✅ Pull requests
- ✅ Documentation

## 🔧 GitHub Actions Workflows

### `deploy.yml` - GitHub Pages Deployment

**Triggers:**

- Push to main branch
- Manual trigger

**What it does:**

1. Builds TypeScript
2. Creates executable package
3. Generates download page
4. Deploys to GitHub Pages

### `build.yml` - Multi-Platform Releases

**Triggers:**

- Version tags (v\*)
- Manual trigger
- GitHub releases

**What it does:**

1. Builds on multiple platforms (macOS, Linux, Windows)
2. Creates platform-specific packages
3. Uploads to GitHub Releases

## 📱 Restaurant Installation Process

### For Restaurants (Simple Instructions)

1. **Download:**

   ```bash
   # Option 1: From GitHub Pages
   curl -L https://your-username.github.io/fos-printer/fos-printer-app.tar.gz | tar -xz

   # Option 2: From GitHub Releases
   # Download from releases page
   ```

2. **Install:**

   ```bash
   cd fos-printer-app
   ./install.sh
   ```

3. **Configure:**

   ```bash
   # Create .env file
   echo "BACKEND_URL=http://your-backend.com" > .env
   echo "RESTAURANT_ID=restaurant-123" >> .env
   ```

4. **Start:**
   ```bash
   fos-printer
   ```

## 🔄 Update Process

### For You (Developer)

1. **Make changes** to the code
2. **Test locally:**
   ```bash
   ./build-executable.sh
   cd fos-printer-app
   ./fos-printer
   ```
3. **Release:**
   ```bash
   ./release.sh
   ```

### For Restaurants

**Automatic Updates (Future Enhancement):**

- Add auto-update functionality
- Check for updates on startup
- Download and install automatically

**Manual Updates:**

- Download new version
- Replace old installation
- Restart the service

## 🐛 Troubleshooting

### GitHub Actions Failures

1. **Check Actions tab** for error details
2. **Verify Node.js version** compatibility
3. **Check file permissions** in scripts
4. **Review build logs** for specific errors

### Build Issues

1. **Clean and rebuild:**

   ```bash
   rm -rf node_modules dist fos-printer-app
   yarn install
   ./build-executable.sh
   ```

2. **Check dependencies:**
   ```bash
   yarn audit
   yarn outdated
   ```

### Distribution Issues

1. **GitHub Pages not updating:**

   - Check Actions tab for deployment status
   - Verify repository settings
   - Clear browser cache

2. **Downloads not working:**
   - Check file permissions
   - Verify file paths
   - Test download URLs

## 📈 Monitoring and Analytics

### GitHub Insights

- **Traffic:** Repository views and downloads
- **Releases:** Download counts per version
- **Issues:** User feedback and bug reports

### Application Monitoring

- **Logs:** Application logs for debugging
- **Status:** Printer connection status
- **Performance:** Print job success rates

## 🎯 Best Practices

1. **Version Management:**

   - Use semantic versioning
   - Tag all releases
   - Keep changelog updated

2. **Testing:**

   - Test on clean machines
   - Verify all platforms
   - Check USB printer compatibility

3. **Documentation:**

   - Keep README updated
   - Document breaking changes
   - Provide troubleshooting guides

4. **Security:**
   - Review dependencies regularly
   - Use HTTPS for downloads
   - Validate user inputs

## 🚀 Future Enhancements

- **Auto-updates:** Built-in update mechanism
- **DMG/EXE installers:** Native installers
- **Code signing:** Digital signatures
- **CI/CD pipeline:** More automation
- **Monitoring dashboard:** Real-time status
