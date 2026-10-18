# ScopeGuard Enterprise UI/UX System & Design Tokens

This document details the ScopeGuard enterprise design tokens, the dark mode architecture, motion physics guidelines, signature interactive components, keyboard shortcuts, and accessibility compliance.

---

## 1. Design Tokens & Color System

The ScopeGuard UI system utilizes strict semantic CSS custom properties mapped through Tailwind CSS v4 / v3 `darkMode: "class"`. This ensures zero layout shifts, zero Flash of Unstyled Content (FOUC), and strict WCAG AA contrast compliance across both light and dark themes.

### 1.1 Surface Tokens

| Token | Light Value | Dark Value | Purpose |
|---|---|---|---|
| `--surface-canvas` | `#f8fafc` (Slate 50) | `#020617` (Slate 950) | Top-level page background |
| `--surface-card` | `#ffffff` (Pure White) | `#0f172a` (Slate 900) | Elevated content containers & modals |
| `--surface-subtle` | `#f1f5f9` (Slate 100) | `#1e293b` (Slate 800) | Table headers, inset blocks, code tags |
| `--surface-border` | `#e2e8f0` (Slate 200) | `#334155` (Slate 700) | Crisp separator boundaries |
| `--text-primary` | `#0f172a` (Slate 900) | `#f8fafc` (Slate 50) | Primary headings & high-contrast labels |
| `--text-muted` | `#64748b` (Slate 500) | `#94a3b8` (Slate 400) | Secondary descriptions & timestamps |

### 1.2 Status Tokens (WCAG AA Compliant)

All status tokens guarantee a minimum contrast ratio of &ge; 4.5:1 against card backgrounds:

- **Approved / Success:**
  - Light: Text `#047857` (Emerald 700) on `#ecfdf5` (Emerald 50)
  - Dark: Text `#34d399` (Emerald 400) on `#022c22` (Emerald 950/80)
- **Pending / Warning:**
  - Light: Text `#b45309` (Amber 700) on `#fffbeb` (Amber 50)
  - Dark: Text `#fbbf24` (Amber 400) on `#451a03` (Amber 950/80)
- **Rejected / Danger:**
  - Light: Text `#be123c` (Rose 700) on `#fff1f2` (Rose 50)
  - Dark: Text `#fb7185` (Rose 400) on `#4c0519` (Rose 950/80)
- **Draft / Neutral:**
  - Light: Text `#334155` (Slate 700) on `#f1f5f9` (Slate 100)
  - Dark: Text `#cbd5e1` (Slate 300) on `#1e293b` (Slate 800)

### 1.3 Shadow Hierarchy

- `shadow-subtle`: `0 1px 2px 0 rgb(0 0 0 / 0.04)`
- `shadow-card`: `0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)`
- `shadow-lift`: `0 8px 16px -4px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)`

---

## 2. Motion Physics & Reduced Motion Fallbacks

All animations and micro-interactions adhere strictly to business software ergonomics: sub-300ms durations, non-linear ease-outs, and zero layout thrashing (animating strictly `opacity` and `transform`).

### 2.1 Physics Tokens (`lib/motion.tsx`)

- **Spring Physics:** `stiffness: 350`, `damping: 30`, `mass: 0.8`
- **Standard Ease:** `[0, 0, 0.2, 1]` (cubic-bezier ease-out)
- **Standard Durations:**
  - Entrance: `200ms` &ndash; `220ms`
  - Exit / Dismiss: `150ms`
  - Feedback Pulse: `150ms`

### 2.2 Strict Reduced Motion Compliance

Whenever a user has enabled `prefers-reduced-motion` in their operating system:
1. `useReducedMotion()` intercepts all animation variant calculations.
2. All translation (`y: 12`, `x: 6`), rotation, and 3D tilt transformations are collapsed to zero.
3. All durations and delays collapse to `0ms`.
4. Card tilt and mouse spotlight tracking are completely disabled to prevent disorientation.

---

## 3. Interactive Component Registry

### 3.1 `ThemeToggle` (`components/ui/ThemeToggle.tsx`)
- Animated Sun/Moon morphing toggle button with rotation physics.
- Reads and updates `localStorage.getItem('scopeguard-theme')`.
- Adds or removes the `.dark` class on `document.documentElement`.
- Fully accessible with `aria-label="Toggle theme"` and keyboard focus states.

### 3.2 `SpotlightCard` (`components/motion/SpotlightCard.tsx`)
- Cursor-following radial gradient glow (`radial-gradient`) using hardware-accelerated pointer events.
- 3D card tilt (&plusmn;4&deg; max) with smooth spring return upon pointer leave.
- Disabled on touch screens and when `prefers-reduced-motion` is active.

### 3.3 `SegmentedImpactBar` (`components/projects/SegmentedImpactBar.tsx`)
- Visualizes Baseline Contract Budget (Indigo), Approved Extra Scope (Emerald), and Pending Proposals (Amber striped).
- Animates each segment's width sequentially with `motion.div`.
- Formats all monetary values using integer minor units through `lib/domain/money.ts`.

### 3.4 `MagneticButton` (`components/motion/MagneticButton.tsx`)
- Magnetic pull micro-interaction on primary CTA buttons.
- Gently tracks cursor offset within the button bounding box (&plusmn;6px max).

### 3.5 `CopyButton` (`components/ui/CopyButton.tsx`)
- One-click clipboard copy button with spring-animated checkmark transition.
- Emits polite `aria-live` screen-reader announcement upon copy confirmation.

### 3.6 `CommandPalette` (`components/ui/CommandPalette.tsx`)
- Global `Ctrl+K` / `⌘K` command dialog powered by `cmdk`.
- Instant search and navigation across Dashboard, Projects, Settings, and Team.
- Quick theme switcher (`Light`, `Dark`, `System`).
- Direct keyboard navigation (`↑`, `↓`, `↵`, `ESC`).

### 3.7 `KeyboardShortcutsModal` (`components/ui/KeyboardShortcutsModal.tsx`)
- Pressing `?` brings up the keyboard shortcuts modal.
- Includes two-key sequence shortcuts (`G then D`, `G then P`, `G then T`, `G then S`).
- Excludes typing events originating from `<input>`, `<textarea>`, and `[contenteditable]`.

### 3.8 `NotificationPanel` (`components/layout/NotificationPanel.tsx`)
- Slide-over drawer opened from the header bell icon.
- Displays live workspace audit trail activities with relative timestamps.
- Features unread indicator dot and "Mark as read" functionality.

### 3.9 `ChangeRequestBoardView` (`components/changes/ChangeRequestBoardView.tsx`)
- Interactive Kanban Board organizing proposals into status columns:
  - `Draft` &rarr; `Pending Review` &rarr; `Approved` &rarr; `Rejected` &rarr; `Withdrawn`
  - Displays column financial sum rollups, deliverable tags, and version badges.
  - Toggled seamlessly alongside the Table view in `ProjectChangesClientList.tsx`.

### 3.10 `OnboardingChecklist` (`components/dashboard/OnboardingChecklist.tsx`)
- Guided onboarding card for newly established workspaces.
- Real progress bar and dynamic completion checks for workspace, projects, deliverables, and change requests.

---

## 4. Keyboard Shortcuts Reference

| Shortcut | Description | Context |
|---|---|---|
| `⌘ + K` or `Ctrl + K` | Open Global Command Palette | Global |
| `?` (Shift + /) | Open Keyboard Shortcuts Cheat-sheet | Global (unfocused) |
| `G` then `D` | Navigate to Dashboard | Global (unfocused) |
| `G` then `P` | Navigate to Projects | Global (unfocused) |
| `G` then `T` | Navigate to Team Settings | Global (unfocused) |
| `G` then `S` | Navigate to Workspace Settings | Global (unfocused) |
| `ESC` | Dismiss open dialogs, modals, or slide-over drawer | Modals / Drawers |
| `↑` / `↓` | Navigate list items in Command Palette | Command Palette |
| `↵` (Enter) | Select active item | Command Palette |

---

## 5. Automated Quality Checks & Accessibility

The design system is continuously validated through automated suites:

1. **Accessibility (WCAG AA):**
   - `@axe-core/playwright` verifies zero automated violations on landing, auth, and client approval pages.
2. **TypeScript & Static Analysis:**
   - `npm run typecheck` passes with zero type errors.
3. **Linting:**
   - `npm run lint` passes with 0 warnings and 0 errors.
4. **Unit & Integration Tests:**
   - `npm run test` executes 263 tests across 24 test suites with 100% pass rate.
5. **Next.js Production Compilation:**
   - `npm run build` succeeds across all 18 routes with zero hydration mismatches.
