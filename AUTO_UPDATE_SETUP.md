# Auto-Update Setup for LocalReads

Your LocalReads app now has auto-update functionality! Here's how to set it up:

## 🚀 Features

- **Automatic update checks** every hour
- **Manual update checks** from Settings
- **Update notifications** when new versions are available
- **One-click installation** of updates
- **Automatic app restart** after updates

## ⚙️ Configuration Required

### 1. Update Tauri Config

Edit `src-tauri/tauri.conf.json` and replace the placeholder values:

```json
"updater": {
  "active": true,
  "endpoints": [
    "https://api.github.com/repos/YOUR_USERNAME/LocalReads/releases/latest"
  ],
  "dialog": true,
  "pubkey": "YOUR_PUBLIC_KEY_HERE"
}
```

**Replace:**
- `YOUR_USERNAME` with your GitHub username
- `YOUR_PUBLIC_KEY_HERE` with your Tauri public key

### 2. Generate Tauri Keys

Run this command to generate your signing keys:

```bash
cd src-tauri
cargo tauri signer generate
```

This will create:
- `~/.tauri/localreads-tauri.key` (private key)
- `~/.tauri/localreads-tauri.key.pub` (public key)

Copy the public key content to `tauri.conf.json`.

### 3. GitHub Repository Setup

1. **Create a GitHub repository** for your app
2. **Create releases** with version tags (e.g., `v0.1.1`, `v0.1.2`)
3. **Upload the built app** to each release
4. **Add release notes** in the release description

## 📦 Building and Releasing

### Build for Release

```bash
npm run build:tauri
```

### Create a Release

1. Update version in `package.json` and `src-tauri/Cargo.toml`
2. Build the app: `npm run build:tauri`
3. Create a GitHub release with the new version tag
4. Upload the built app files from `src-tauri/target/release/bundle/`

## 🔄 How It Works

1. **App starts** → Checks for updates automatically
2. **Update found** → Shows notification in top-right corner
3. **User clicks install** → Downloads and installs update
4. **App restarts** → New version is running

## 🛠️ Manual Update Check

Users can manually check for updates:
1. Go to **Settings** → **Updates**
2. Click **"Check for Updates"**
3. If an update is available, click **"Install"**

## 🔒 Security

- Updates are cryptographically signed
- Only updates from your verified public key are accepted
- HTTPS endpoints ensure secure downloads

## 🐛 Troubleshooting

### Update Not Working?
- Check your public key is correct
- Verify GitHub repository URL
- Ensure releases have proper version tags
- Check network connectivity

### Build Errors?
- Make sure Rust toolchain is up to date
- Verify all dependencies are installed
- Check Tauri configuration syntax

## 📚 Resources

- [Tauri Updater Documentation](https://tauri.app/v1/guides/distribution/updater/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases)
- [Tauri Signing Guide](https://tauri.app/v1/guides/distribution/signing/)
