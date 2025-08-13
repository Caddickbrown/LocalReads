# LocalReads

A comprehensive, local‑first reading tracker with advanced analytics, goal setting, and gamification features. Built with Tauri (desktop), React + Vite, Tailwind, and SQLite via tauri-plugin-sql.

## Features

- **Local SQLite single file** (default: `localreads.sqlite` in app data)
- **Books / Reads / Tags / Highlights** with full editing capabilities
- **Smart Lists & Dedicated Views** (Next Up with priority scoring, Re-reads timeline, Activity feed)
- **Advanced Search** (library filters + highlights search with text highlighting)
- **Reading Progress Tracking** (page progress, completion percentages, visual progress bars)
- **Goal Setting & Analytics** (monthly/yearly goals with progress tracking)
- **Mobile-Responsive Design** (touch-friendly navigation and card layouts)
- **Enhanced Dashboard** (statistics, goals, recent activity)
- **CSV Import/Export** with templates (Library and Highlights)
- **Light / Dark / System** theme with 5 color themes (Sepia, Forest, Ocean, Lavender)
- **Keyboard Shortcuts** (Ctrl+N for new book, Ctrl+H for highlights, etc.)

## 🆕 Latest Major Features

### 📖 **Next Up View** (Ctrl+U)
Intelligent reading queue that prioritizes your books based on:
- **Paused books** get highest priority (you were already reading them)
- **Series continuity** to maintain reading flow
- **Previous engagement** (books with highlights show interest)
- **Customizable sorting** by priority, title, author, series, or date added

### 🔄 **Re-reads View** (Ctrl+Shift+R)  
Complete reading history for books you've read multiple times:
- **Reading timeline** showing all reads with dates, ratings, and reviews
- **Average rating calculation** across all reads
- **Reading span analysis** (how long between first and latest read)
- **Progress evolution** tracking how your opinion changed over time

<!-- Streaks & achievements removed -->

### 🎯 **Reading Goals & Progress Tracking**
Set and track your reading targets:
- **Monthly and yearly goals** with customizable targets
- **Visual progress bars** with color-coded status (green for achieved, blue for on-track, yellow for behind)
- **Smart progress calculation** based on finished books
- **Achievement celebration** when goals are reached

### 📱 **Mobile-First Design**
Completely redesigned for mobile devices:
- **3-column navigation grid** for easy thumb navigation
- **Card-based library view** optimized for touch interactions
- **Touch-friendly buttons** with 44px minimum hit targets
- **Responsive breakpoints** that work seamlessly across devices

### 🔍 **Advanced Search Features**
Enhanced search capabilities:
- **Highlights search** with filtering by book, author, or text content
- **Text highlighting** in search results for easy scanning
- **Contextual empty states** with helpful tips and suggestions
- **Clear search functionality** with one-click filter reset

### 📈 **Activity Dashboard**
Comprehensive overview of your reading activities:
- **Recent activity feed** showing finished books, started reads, and new highlights
- **Visual activity indicators** with color-coded icons
- **Reading statistics** with goal progress visualization

## Roadmap

For upcoming features and detailed change history, see [CHANGELOG.md](CHANGELOG.md).

## Import Guide

### Grouping and order
Keep imports in these groups, in this order:
1) External libraries (React, third‑party)
2) Absolute project imports using the `@/` alias
3) Relative imports (`./`, `../`), ordered by proximity

Within each group:
- Put side‑effect imports at the very top of the group (rare; CSS/global once in `main.tsx`)
- Sort imports alphabetically by module specifier when reasonable
- Prefer named imports; default imports only when required by the library
- Split out type‑only imports with `import type` when it improves clarity

Path alias is configured in `tsconfig.json` as `@/*` → `src/*`. Prefer the alias instead of deep relative paths.

### Quick examples

Component with external, alias, and relative imports:
```ts
import React, { useEffect, useState } from 'react'
import { save, open } from '@tauri-apps/plugin-dialog'

import Dashboard from '@/components/Dashboard'
import { listBooks } from '@/db/repo'
import type { Book } from '@/types'

import { Card, Button } from './ui'
```

### Import formats overview

| Category | Example | Notes |
| --- | --- | --- |
| External libraries | `import React, { useState } from 'react'` | React, charts, icons, etc. |
| Tauri plugins | `import { save } from '@tauri-apps/plugin-dialog'` | Prefer named APIs needed per file. |
| App alias `@/` | `import { listBooks } from '@/db/repo'` | Use alias instead of deep relative paths. |
| Types (alias) | `import type { Book, Read } from '@/types'` | Use `import type` to avoid including code. |
| Relative (same dir) | `import { Card } from './ui'` | Keep near the bottom group. |
| Relative (parent) | `import EditDialog from '../EditDialog'` | Avoid long chains by using `@/` where possible. |

### CSV formats

**Import Templates**: The Settings page now includes "Template" buttons that export empty CSV files with the correct headers for easy bulk importing. Use these templates as starting points for your data.

#### Highlights CSV

Headers (preferred):
```csv
id,book,author,text,created_at
```

Minimal headers (alternate):
```csv
title,text
```

Example (preferred headers):
```csv
id,book,author,text,created_at
h_9g7k2m1a,The Hobbit,J. R. R. Tolkien,"So comes snow after fire, and even dragons have their endings.",2024-10-05 12:34:56
h_1x2y3z4a,The Fellowship of the Ring,J. R. R. Tolkien,"Not all those who wander are lost.",
```

Example (alternate headers using `title` instead of `book`):
```csv
id,title,author,text,created_at
h_ab12cd34,The Two Towers,J. R. R. Tolkien,"There is some good in this world, and it's worth fighting for.",
```

Sample (table view for readability):

| id | book | author | text | created_at |
| --- | --- | --- | --- | --- |
| h_9g7k2m1a | The Hobbit | J. R. R. Tolkien | So comes snow after fire, and even dragons have their endings. | 2024-10-05 12:34:56 |
| h_1x2y3z4a | The Fellowship of the Ring | J. R. R. Tolkien | Not all those who wander are lost. | |

Rules:
- Required fields: `text` plus either `book` or `title`.
- If `book`/`title` doesn't match an existing book, it will be created automatically.
- `id` and `created_at` are optional. If `id` is missing, it's generated.
- Commas and quotes inside `text` are supported via CSV quoting. Avoid line breaks inside a single cell.

#### Library CSV

Headers (as exported):
```csv
title,author,seriesName,seriesNumber,obtained,type,status,tags,latestStart,latestEnd,latestRating,latestReview,highlightsCount
```

Example:
```csv
title,author,seriesName,seriesNumber,obtained,type,status,tags,latestStart,latestEnd,latestRating,latestReview,highlightsCount
The Hobbit,J. R. R. Tolkien,,,"Owned",Book,Finished,,2024-01-01,2024-01-05,5,"Great adventure",2
Mistborn,Brandon Sanderson,Mistborn,1,,Ebook,To Read,"fantasy;epic",,,,,0
```

Type‑only imports:
```ts
import type { Read } from '@/types'
```

Side‑effect imports (keep to a minimum):
```ts
// Only once globally (already done in src/main.tsx)
import './styles/index.css'
```

### Do / Don't
- Do: use `@/` alias for project modules
- Do: group and order consistently
- Do: use `import type` for type‑only imports to avoid bundling code unintentionally
- Don't: use long chains of relative paths when an alias is available
- Don't: add file extensions for TS/TSX imports
- Don't: add per‑component CSS imports; Tailwind styles are global via `src/main.tsx`

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
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

## Potential Names
- Inkmarks
- Pagekeeper