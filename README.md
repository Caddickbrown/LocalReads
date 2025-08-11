# LocalReads

A fast, local‑first reading tracker with Library, Smart Lists, Highlights, and a simple Dashboard. Built with Tauri (desktop), React + Vite, Tailwind, and SQLite via tauri-plugin-sql.

## Features
- **Local SQLite single file** (default: `localreads.sqlite` in app data)
- **Books / Reads / Tags / Highlights**
- **Smart Lists** (Next Up, Finished This Year, Re-reads)
- **Omni search + filters** (status, tag, year)
- **Dashboard** with books-per-year + quick tiles
- **CSV Import/Export** (minimal schema)
- **Light / Dark / System** theme

## Requirements
- Node.js 18+
- Rust toolchain (stable)
- Tauri prerequisites for your OS: https://tauri.app

## Setup
```bash
# 1) Install deps
npm install

# 2) Dev (web only)
npm run dev

# 3) Dev (desktop window)
npm run tauri:dev