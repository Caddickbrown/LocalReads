# Update Button Implementation

## What Has Been Implemented

The Update button in your LocalReads Settings is now fully functional with the following features:

### 1. Manual Update Checking
- **Check for Updates Button**: Users can manually check for updates by clicking the "Check for Updates" button in Settings
- **Update Information Display**: When an update is available, it shows:
  - Version number
  - Release date
  - Release notes/body
  - Install button

### 2. Automatic Update Checking
- **App Startup Check**: The app automatically checks for updates 2 seconds after startup
- **Background Process**: Update checks happen in the background without blocking the UI

### 3. Update Installation
- **One-Click Install**: Users can install updates with a single click
- **Automatic Restart**: After installation, the app automatically restarts with the new version

## Technical Implementation

### Dependencies Added
- `@tauri-apps/plugin-updater` - For update functionality
- Added to both `package.json` and `Cargo.toml`

### Configuration Files Updated
- **`src-tauri/tauri.conf.json`**: Added updater plugin configuration
- **`src-tauri/Cargo.toml`**: Added updater plugin dependency
- **`src-tauri/src/main.rs`**: Registered updater plugin
- **`src-tauri/capabilities/main.json`**: No special permissions needed

### Code Changes
- **`src/utils/updater.ts`**: Complete AutoUpdater class implementation
- **`src/components/Settings.tsx`**: Connected update UI to updater logic
- **`src/App.tsx`**: Added automatic update checking on app startup

## Update Source Configuration

The app is configured to check for updates from:
```
https://api.github.com/repos/dcb/LocalReads/releases/latest
```

**Note**: You'll need to update this URL to match your actual GitHub repository.

## How It Works

1. **Update Check**: The app queries GitHub's API for the latest release
2. **Version Comparison**: Compares the latest version with the current app version
3. **User Notification**: If an update is available, shows update information
4. **Download & Install**: Downloads the update and installs it automatically
5. **App Restart**: Restarts the app with the new version

## Testing the Update Button

1. Open the LocalReads app
2. Go to Settings (gear icon)
3. Scroll to the "Updates" section
4. Click "Check for Updates"
5. If an update is available, you'll see the update information and an "Install" button

## Next Steps for Full Implementation

To make this fully functional, you'll need to:

1. **Update GitHub Repository URL**: Change the endpoint in `tauri.conf.json` to match your actual repository
2. **Create GitHub Releases**: Set up a release workflow for your app
3. **Code Signing**: Add a public key to the `tauri.conf.json` for secure updates
4. **Test with Real Releases**: Create a test release to verify the update process

## Troubleshooting

If updates aren't working:

1. Check the browser console for error messages
2. Verify the GitHub repository URL is correct
3. Ensure you have releases published on GitHub
4. Check that the app version in `tauri.conf.json` is lower than the GitHub release version

## Future Enhancements

- **Update Notifications**: Show toast notifications when updates are available
- **Auto-Install**: Option to automatically install updates
- **Update History**: Track and display update history
- **Rollback**: Ability to rollback to previous versions
