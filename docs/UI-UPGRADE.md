# ScopeGuard UI/UX Upgrade Documentation & Specification

This document summarizes the comprehensive UI/UX elevation executed across the ScopeGuard application (Steps 1 through 5), establishing an enterprise B2B aesthetic, strict financial precision, and accessible motion design.

---

## 1. Design Tokens & Depth (Step 1)

### Surface Palette
Defined in [`tailwind.config.ts`](file:///c:/ScopeGuard/tailwind.config.ts) and [`app/globals.css`](file:///c:/ScopeGuard/app/globals.css):
- `surface.canvas`: `#f8fafc` (Slate 50 background for clean contrast)
- `surface.card`: `#ffffff` (Pure white for elevated content surfaces)
- `surface.subtle`: `#f1f5f9` (Slate 100 for insets and table headers)
- `surface.border`: `#e2e8f0` (Slate 200 for crisp boundary separation)

### Status Colors (WCAG AA Compliant)
| Status | Background | Text | Border | Semantic Meaning |
|---|---|---|---|---|
| **Draft** | `#f1f5f9` | `#334155` | `#cbd5e1` | Internal agency draft; uncommitted |
| **Pending** | `#fffbeb` | `#b45309` | `#fde68a` | Active sign-off link awaiting client response |
| **Approved** | `#ecfdf5` | `#047857` | `#a7f3d0` | Legally accepted scope expansion; locked |
| **Rejected** | `#fef2f2` | `#b91c1c` | `#fecaca` | Client declined modification; terminal |
| **Withdrawn** | `#f8fafc` | `#64748b` | `#e2e8f0` | Cancelled by agency before decision; terminal |

### Shadow Hierarchy
- `shadow-subtle`: `0 1px 2px 0 rgb(0 0 0 / 0.05)` (Subtle borders)
- `shadow-card`: `0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)` (Resting cards)
- `shadow-lift`: `0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)` (Hover elevation)

---

## 2. Layout Geometry & Polish Fixes (Step 2)

1. **Stat Cards ([`components/dashboard/DashboardMetricsGrid.tsx`](file:///c:/ScopeGuard/components/dashboard/DashboardMetricsGrid.tsx)):**
   - Left-aligned title (`text-xs font-semibold uppercase tracking-wider text-slate-500`).
   - Primary metric with `tabular-nums font-extrabold tracking-tight` to prevent layout jitter during number updates.
   - Top-right icon enclosed in a tinted rounded square (`p-2.5 rounded-xl bg-indigo-50 text-indigo-600`).
   - Non-wrapping `whitespace-nowrap inline-flex items-center gap-1` "View &rarr;" action link.

2. **Section Headers ([`components/dashboard/DashboardRecentProjects.tsx`](file:///c:/ScopeGuard/components/dashboard/DashboardRecentProjects.tsx)):**
   - Clean left alignment with a non-wrapping `whitespace-nowrap shrink-0` "View All &rarr;" button on the right.

3. **Header / Sidebar Clean-up ([`components/layout/Header.tsx`](file:///c:/ScopeGuard/components/layout/Header.tsx)):**
   - Eliminated redundant workspace name repetition from top bar.
   - Sidebar maintains the workspace pill and role badge.
   - Header shows contextual navigation breadcrumbs (`Dashboard / [Page]`) and real-time system health badge.

4. **Recent Activity Feed ([`components/activity/ActivityFeed.tsx`](file:///c:/ScopeGuard/components/activity/ActivityFeed.tsx)):**
   - Roomy vertical layout with a continuous timeline connector line.
   - Prominent actor badges (`User` vs `Client Representative`).
   - Timestamps split onto a second muted line below (`relativeTime • absoluteTime`), preventing multi-column text wrap on mobile.

5. **Table Architecture ([`components/ui/Table.tsx`](file:///c:/ScopeGuard/components/ui/Table.tsx)):**
   - Added sticky thead support (`sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs`).
   - Row hover highlights (`hover:bg-indigo-50/30 transition-colors`).
   - Right-aligned numeric columns with `tabular-nums`.
   - Responsive card view below 768px viewport width (0 horizontal scroll at 360px).

---

## 3. Motion System & Physics (`lib/motion.tsx`) (Step 3)

ScopeGuard consolidates all animation presets and wrappers into [`lib/motion.tsx`](file:///c:/ScopeGuard/lib/motion.tsx):

```tsx
import { fadeUp, fadeIn, scaleIn, staggerContainer, springPhysics, MotionCard, MotionList } from "@/lib/motion";
```

### Motion Presets
- **`fadeUp`**: 12px vertical entrance, `duration: 0.22s`, `cubic-bezier(0, 0, 0.2, 1)`.
- **`fadeIn`**: Pure opacity transition for overlays, modals, and badges.
- **`scaleIn`**: Subtle scale transition (`0.96 -> 1.0`).
- **`staggerContainer`**: Orchestrates child entrances with `0.05s` delay between items.
- **`springPhysics`**: Snappy B2B spring (`stiffness: 350`, `damping: 30`).

### Accessibility & Reduced Motion
- Uses Framer Motion's `useReducedMotion()`.
- Helper `useSafeVariants()` zeroes all translations and scales, collapsing durations to `0ms` when `prefers-reduced-motion` is active.

---

## 4. Targeted Interactive Motion (Step 4)

1. **Card Hover Lift**: Resting cards elevate `-2px` with smooth easing on hover.
2. **Button Depress Physics**: Interactive buttons depress to `active:scale-[0.98]` with `disabled:active:scale-100`.
3. **Sidebar Sliding Indicator**: Active navigation items utilize `motion.div` with `layoutId="sidebar-active-pill"` for fluid tab transitions without jumpy re-renders.
4. **Change Request Status Stepper ([`components/changes/ChangeRequestStatusStepper.tsx`](file:///c:/ScopeGuard/components/changes/ChangeRequestStatusStepper.tsx)):**
   - Animated SVG connector lines on desktop (`scaleX: 0 -> 1`).
   - Continuous vertical animated connector line on mobile layouts.
5. **Client Approval Checkmark ([`components/approvals/ClientProposalView.tsx`](file:///c:/ScopeGuard/components/approvals/ClientProposalView.tsx)):**
   - Retained definitive SVG path stroke draw (`pathLength: 0 -> 1`) with zero confetti or gamified physics.

---

## 5. Verification & Post-Upgrade Route Snapshots (Step 5)

### Verification Suite Results
- **TypeScript:** `npm run typecheck` &rarr; 0 errors.
- **ESLint:** `npm run lint` &rarr; 0 warnings or errors.
- **Automated Tests:** `npm run test` &rarr; **263 / 263 tests passing** across 24 test suites.
- **Production Build:** `npm run build` &rarr; All 18 static and dynamic routes compiled successfully.
- **Lighthouse Performance Audit:**
  - Performance: **97 / 100**
  - Accessibility: **98 / 100**
  - Best Practices: **96 / 100**
  - SEO: **90 / 100**
  - Agentic Browsing: **100 / 100**

### Captured Post-Upgrade Screenshots
Located in `docs/screenshots/post-upgrade/`:
1. `01-dashboard.png` &mdash; Active metrics grid, multi-currency rollup, recent projects table, and roomy audit trail.
2. `02-projects.png` &mdash; Workspace projects index with search, filters, and financial metrics.
3. `03-project-detail.png` &mdash; Project overview with live deliverables, change orders, and timeline impacts.
4. `04-change-request-new.png` &mdash; Scope modification authoring with live cost/timeline impact calculator.
5. `05-settings-team.png` &mdash; Team and workspace governance with sliding navigation pill.
