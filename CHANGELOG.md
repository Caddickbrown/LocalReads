# Changelog

All notable changes to LocalReads will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Upcoming/Potential Additions

- Auto-update experience
  - Re-enable in-app update checks and installs via Tauri updater (`utils/updater.ts`), with a non-blocking `UpdateNotification` banner and release notes
- Gems (highlights)
  - Export to include standalone gems and `source_title`/`source_author`; import to support true standalone gems without creating placeholder books
  - Inline editing improvements (multi-line input, optional markdown-style formatting)
- Library & Lists
  - Saved filters/Smart lists and quick filter presets
  - Virtualized list rendering for large libraries; batch edit for tags/status/obtained
- Next Up
  - Optional drag-and-drop manual ordering; tunable scoring (series continuity boost, deprioritize long-paused)
- Search
  - Global search across titles, authors, series, tags, reviews, and gems with fuzzy matching and keyboard navigation
- Analytics & Goals
  - Author/series breakdowns, reading pace estimates, progress projections; opt-in achievements/streaks
- Sync & Backup
  - One-click data folder selection with automatic scheduled backups; friendlier cloud-folder use via custom DB path
  - Versioned migrations with safe rollback and integrity checks
- Accessibility & UX
  - Improved screen reader labels, focus outlines, and contrast; customizable keyboard shortcuts
- Theming
  - Additional color themes and high-contrast mode
- Integrations
  - Goodreads/Calibre/OPDS import presets and improved CSV wizards
- Platform polish
  - Native app menu (File → Import/Export, View → Toggle Sidebar, Help → Shortcuts)

## [1.3.0] - 2025-08-14

### Added
- Gems (renamed from Highlights) throughout the app
  - Gems list with add/edit/delete, optional date and commentary
  - Standalone gems support with source title/author (no library book required)
  - Gems appear in Recent Activity; commentary shown when present
  - Gems total tile added to Dashboard
- Show current tags on the book page (Edit dialog)
  - Book tags load from the database and display in the tag list
- Click-to-open book from Library
  - Book titles are now clickable to open the editor (removed Edit buttons)
- App icon in sidebar header (replaces book emoji)
- Navigation emoji polish: Dashboard 📈, Gems 💎, Next Up 🧭, Re-reads 🔁

### Changed
- Suggestions (author/series) only show when editing those fields
  - Small blur delay to ensure suggestion clicks register
- Removed “Click to filter” hint on Dashboard tiles
- Removed Book Type from book form (Type is only relevant per-read in Reading Progress)

### Fixed
- Add Gem with alternate source now saves correctly and displays source title/author
- Standalone gems no longer create fake “book” entries or appear in the Library
- Export/Import for gems updated to include commentary; imports accept optional commentary

## [1.2.0] - 2025-08-14

### Added
- **Collapsible Sidebar Navigation**: Desktop interface now features a modern sidebar that expands on hover
  - Smooth slide-out animation for sidebar width (300ms duration with ease-in-out)
  - Text labels fade in smoothly with staggered delay (100ms) after sidebar expands
  - Icons remain visible when collapsed for quick navigation
  - Improved animation timing to eliminate jitter and provide polished UX
  - Maintains mobile navigation unchanged for optimal touch experience
- **Breadcrumb Navigation**: Dynamic breadcrumbs in header show current location and context
  - Shows navigation path (Home > Current View > Context)
  - Displays search queries and filters in breadcrumb context
  - Clickable breadcrumb segments for quick navigation back
  - Real-time updates based on user actions and view changes
- **OS-Specific Keyboard Shortcuts**: Platform-aware shortcuts for better native experience
  - Uses Cmd (⌘) key on macOS instead of Ctrl for all shortcuts
  - Maintains Ctrl key on Windows and Linux
  - Updated keyboard shortcuts help dialog to show correct modifier keys
  - Improved accessibility and native app feel
- **Next Up Priority Override**: Manual priority control for reading queue
  - "Mark as Next Up" checkbox gives books 1000 priority points as override
  - Books marked as Next Up always appear at the top regardless of other factors
  - Green star badge (⭐ Next Up) visually identifies priority books
  - Maintains intelligent scoring for non-priority books (paused, series, highlights, etc.)
  - Database migration automatically adds priority column to existing databases
  - Checkbox available in both Next Up view and book edit dialog
  - Proper event handling prevents unwanted dialog opening when toggling priority

### Changed
- Enhanced sidebar animations with better timing and smooth transitions
- Improved keyboard shortcut system with OS detection and appropriate modifier keys
- Updated help dialog to display platform-specific shortcut combinations
- **Settings redesigned as popup modal**: Moved settings from sidebar navigation to cog button next to search
  - Settings now opens as overlay modal similar to keyboard shortcuts help
  - Cleaner sidebar navigation with only content views (Library, Dashboard, etc.)
  - Settings accessible from both desktop and mobile via cog icon
  - Improved UX with modal backdrop and proper close handling

## [1.1.0] - 2025-08-13

### Added
- Global search bar in top navigation menu for better accessibility
- Next Up list management with edit mode toggle and individual book actions
- Clickable books in Next Up list for quick editing
- Compact theme selectors using flex layouts instead of full-width grids
- Edit and remove buttons for Next Up list management

### Changed
- Moved omni search from Library sidebar to top navigation bar
- Clarified filter dropdown labels (e.g. 'All (status)' and 'All (tags)' instead of just 'All')
- Streamlined interface by removing redundant 'Back to Library' buttons from all views
- Improved navigation structure with global search accessibility
- Enhanced filter labels for better UX clarity
- Made dark mode and theme selectors more compact using natural sizing

### Fixed
- Add Gem with alternate source now saves correctly and displays source title/author
- Standalone gems no longer create fake “book” entries or appear in the Library
- Export/Import for gems updated to include commentary; imports accept optional commentary
- Removed duplicate "Filters" title in Library component
- Updated keyboard shortcuts to work with new global search location

## [1.0.0] - 2025-08-13

### Added
- **Core Reading Tracker**: Local SQLite database with books, reads, tags, and highlights
- **Smart Lists & Views**: 
  - Next Up view with intelligent priority scoring based on paused books, series continuity, and engagement
  - Re-reads view with complete reading history timeline
  - Recent activity feed with visual indicators
- **Advanced Search**: Library filters and highlights search with text highlighting
- **Reading Progress Tracking**: Page progress, completion percentages, visual progress bars
- **Goal Setting & Analytics**: Monthly/yearly goals with progress tracking and visual indicators
- **Reading Streaks & Achievements**: Gamification with badges (Week Warrior, Monthly Master, Reading Legend) and milestone tracking (Bibliophile, Bookworm, Scholar)
- **Mobile-Responsive Design**: 3-column navigation grid, touch-friendly card layouts, 44px minimum hit targets
- **Enhanced Dashboard**: Statistics, streaks, goals, recent activity, achievements with clickable tiles
- **CSV Import/Export**: Library and Highlights with template generation
- **Theme System**: Light/Dark/System modes with 5 color themes (Default, Sepia, Forest, Ocean, Lavender)
- **Keyboard Shortcuts**: Comprehensive shortcuts (Ctrl+N for new book, Ctrl+H for highlights, Ctrl+U for Next Up, etc.)
- **Multiple Reads Support**: Track multiple reading sessions per book with different formats
- **Smart Priority Algorithm**: Considers paused books, series continuity, and user engagement
- **Activity Timeline**: Track finished books, started reads, and new highlights
- **Empty States**: Contextual guidance with helpful tips and illustrations
- **Loading States**: Spinners and feedback for better user experience
- **Micro-interactions**: Hover animations and visual feedback on interactive elements

### Technical Features
- **Tauri Desktop App**: Cross-platform desktop application
- **React + Vite Frontend**: Modern React with TypeScript
- **Tailwind CSS**: Responsive design system
- **SQLite Database**: Local-first data storage via tauri-plugin-sql
- **Import System**: Support for CSV and JSON formats with validation
- **Error Handling**: Comprehensive error messages and user feedback
- **Database Management**: Configurable database location with migration support

### Developer Features
- **Import Guidelines**: Structured import organization with `@/` alias support
- **Code Organization**: Clean component structure with TypeScript
- **Build System**: Automated builds with Rust + Node.js toolchain
- **Development Mode**: Hot reload for web and desktop development

### Documentation
- **Import Guides**: Detailed CSV format documentation with examples
- **Setup Instructions**: Complete development environment setup
- **Feature Documentation**: Comprehensive feature descriptions and usage guides
