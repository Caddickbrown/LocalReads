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

## Roadmap / TODO

### ✅ Core Features (Completed)
- [x] Editable highlights (edit/delete highlights in UI)
- [x] Support multiple reads per book (add/manage multiple reading entries)
- [x] Add Author, Series, and Tag search when adding a book
- [x] Per-read type (ebook vs audiobook) selection
- [x] Make Obtained a checkbox (or otherwise simplify acquisition tracking)
- [x] Export/Import functionality (Library CSV, Highlights CSV, JSON)
- [x] Allow changing the database file location with detailed error messages
- [x] Colorful theme system (Sepia, Forest, Ocean, Lavender) with 0.5-second fade transitions
- [x] Dashboard with reading statistics and colorful tiles
- [x] Show reading dates in the Library table (split into Start Date and End Date)
- [x] Import formats documentation and guides
- [x] Add loading states and spinners for better feedback
- [x] Implement keyboard shortcuts (Ctrl+N for new book, Ctrl+E for export, etc.)
- [x] Micro-interactions and hover animations on book cards
- [x] Clickable dashboard tiles that filter library view
- [x] Enhanced theme system with proper dark mode colors and theme-specific selection
- [x] Improved button text colors and visibility across all themes
- [x] Modern dark mode toggle with prettier UI

### 🚀 UX Polish & Improvements
- [ ] Enhanced empty states with helpful tips and illustrations
- [ ] Better mobile/responsive experience with touch-friendly buttons
- [ ] Progress bars for reading completion percentage

### 📚 Smart Lists & Views
- [ ] Dedicated "Next Up" view with sorting options and reading context
- [ ] Dedicated "Re-reads" view with reading history timeline
- [ ] Recent activity feed on dashboard
- [ ] Reading streak counter and achievement system

### 🎨 Navigation & Interface
- [ ] Update Menu to a sidebar with hover behavior
- [ ] Improved navigation with breadcrumbs
- [ ] Better responsive design for tablets and mobile
- [ ] Swipe gestures for mobile navigation
- [ ] Highlights Search

### 📈 Advanced Features
- [ ] Reading analytics and progress tracking
- [ ] Reading speed analysis (pages per day, session length)
- [ ] Book recommendations based on reading history and ratings
- [ ] Monthly reading goals and progress tracking
- [ ] Genre preferences chart and reading pattern analysis

### 🌍 Platform Expansion
- [ ] iOS/Android/Web version
- [ ] Sync across devices with cloud storage
- [ ] Offline reading progress sync
- [ ] Cloud backup and restore options

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
- If `book`/`title` doesn’t match an existing book, it will be created automatically.
- `id` and `created_at` are optional. If `id` is missing, it’s generated.
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

### Do / Don’t
- Do: use `@/` alias for project modules
- Do: group and order consistently
- Do: use `import type` for type‑only imports to avoid bundling code unintentionally
- Don’t: use long chains of relative paths when an alias is available
- Don’t: add file extensions for TS/TSX imports
- Don’t: add per‑component CSS imports; Tailwind styles are global via `src/main.tsx`

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
## Potential Names
- Inkmarks
- Pagekeeper