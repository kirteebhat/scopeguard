# ScopeGuard Motion Design System & Conventions

This document specifies the motion design system, interaction principles, animation curves, durations, and accessibility rules implemented across ScopeGuard.

---

## 1. Principles & B2B Tone Guidelines

ScopeGuard is mission-critical financial and contractual software for professional agencies. Motion exists solely to:
1. **Clarify state transitions:** Communicate where content came from and where it is going.
2. **Reassure high-stakes decisions:** Provide definitive confirmation for legal approvals and calm clarity for rejections.
3. **Preserve spatial orientation:** Connect navigation drawers, tabs, and multi-step forms without visual disorientation.

### Explicit Prohibitions
- **No Frivolous Physics:** No bouncy springs (damping < 25), overshoot wiggles, or gamified confetti.
- **Zero Layout Shifts:** Never animate geometry (`width`, `height`, `margin`, `padding`, `top`, `left`). Animate exclusively `transform` (`translate`, `scale`) and `opacity` on the GPU compositor.
- **Strict Reduced Motion:** Every animated primitive must check `prefers-reduced-motion` or use the `useReducedMotion()` hook to immediately collapse durations to 0ms or neutral opacities.

---

## 2. Timing Tokens & Easing Curves

ScopeGuard standardizes on three core durations and two acceleration curves:

| Token | Duration | Cubic Bézier / Spring | Use Case |
|---|---|---|---|
| **Micro** | `150ms` | `cubic-bezier(0, 0, 0.2, 1)` (ease-out) | Button active scale, input focus rings, toggle switch |
| **Standard** | `200ms`–`250ms` | `cubic-bezier(0, 0, 0.2, 1)` (ease-out) | Route transitions, dialog enter/exit, card hover lift, tab slider |
| **Snappy Spring** | ~`300ms` | `stiffness: 350, damping: 30` | Sliding pill indicators (`Tabs`), mobile navigation drawer |
| **Definitive Stroke** | `450ms` | `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out) | Client sign-off SVG checkmark draw (`pathLength: 0 → 1`) |

```css
/* Easing Tokens */
--ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1);
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 3. Global Reduced-Motion Architecture

### CSS Media Query Baseline
Defined in [`app/globals.css`](file:///c:/ScopeGuard/app/globals.css):
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Motion Hook (`useReducedMotion`)
Client components import `useReducedMotion` from `motion/react`:
```tsx
const shouldReduceMotion = useReducedMotion();

<motion.div
  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2, ease: "easeOut" }}
/>
```

---

## 4. Component Motion Catalog

### 4.1 Route & Page Transitions
- **Implementation:** [`components/motion/PageTransition.tsx`](file:///c:/ScopeGuard/components/motion/PageTransition.tsx) via `app/(authenticated)/template.tsx` and `app/(auth)/template.tsx`.
- **Motion:** Fade + vertical offset (`opacity: 0, y: 6` → `opacity: 1, y: 0`) over 200ms.
- **Why `template.tsx`?** Next.js App Router persists `layout.tsx` across subroute navigations; `template.tsx` instantiates a new React tree for each route navigation, enabling clean page transitions without layout flashes.

### 4.2 Micro-Interactions
- **Buttons ([`components/ui/Button.tsx`](file:///c:/ScopeGuard/components/ui/Button.tsx)):** Micro-scale depress (`active:scale-[0.98] transition-all duration-150`).
- **Inputs ([`components/ui/Input.tsx`](file:///c:/ScopeGuard/components/ui/Input.tsx)):** Instant border and subtle shadow focus ring transition (`transition-all duration-150`).
- **Cards ([`components/ui/Card.tsx`](file:///c:/ScopeGuard/components/ui/Card.tsx)):** Optional `hoverLift` (`hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`).
- **Switches & Toggles ([`components/ui/Switch.tsx`](file:///c:/ScopeGuard/components/ui/Switch.tsx)):** Spring-animated thumb pill toggle (`stiffness: 500, damping: 30`).
- **Checkboxes ([`components/ui/Checkbox.tsx`](file:///c:/ScopeGuard/components/ui/Checkbox.tsx)):** SVG checkmark path draw (`pathLength: 0 → 1`, 180ms).
- **Tabs with Sliding Pill ([`components/ui/Tabs.tsx`](file:///c:/ScopeGuard/components/ui/Tabs.tsx)):** Framer Motion `layoutId="tab-indicator"` with spring physics.
- **Dialogs & Modals ([`components/ui/Dialog.tsx`](file:///c:/ScopeGuard/components/ui/Dialog.tsx)):** Backdrop opacity fade (`opacity: 0 → 1`) and modal container scale (`scale: 0.96, y: 8` → `scale: 1, y: 0`). Focus trap and ESC dismissal fully preserved.
- **Toast Notifications ([`components/ui/Toast.tsx`](file:///c:/ScopeGuard/components/ui/Toast.tsx)):** Slide-in from bottom right with linear CSS countdown progress bar indicator.

### 4.3 Skeleton Shimmer
- **Implementation:** [`components/ui/Skeleton.tsx`](file:///c:/ScopeGuard/components/ui/Skeleton.tsx) + [`app/globals.css`](file:///c:/ScopeGuard/app/globals.css).
- **Motion:** 1.6s infinite linear gradient translation over neutral slate backgrounds (`translate3d(-100%)` → `translate3d(100%)`).

### 4.4 Dashboard Metrics & Progress
- **CountUp ([`components/motion/CountUp.tsx`](file:///c:/ScopeGuard/components/motion/CountUp.tsx)):** Animated number incrementation using cubic ease-out over 900ms. Runs exactly once on initial mount; bypassed under reduced motion.
- **Metrics Grid ([`components/dashboard/DashboardMetricsGrid.tsx`](file:///c:/ScopeGuard/components/dashboard/DashboardMetricsGrid.tsx)):** Staggered card entrance (35ms index delay).
- **Project Impact Bar ([`components/projects/ProjectImpactCard.tsx`](file:///c:/ScopeGuard/components/projects/ProjectImpactCard.tsx)):** Segmented progress bar illustrating original contract baseline budget vs. approved additions percentage with width scale animation.

### 4.5 Change Request Workflow Motion
- **Status Stepper ([`components/changes/ChangeRequestStatusStepper.tsx`](file:///c:/ScopeGuard/components/changes/ChangeRequestStatusStepper.tsx)):** 3-stage pipeline (`Draft` → `Pending Client Review` → `Approved / Final Outcome`). Connecting line uses horizontal `scaleX: 0 → 1` fill, active step has subtle ping indicator, and completed steps show spring checkmark icon.
- **Version Timeline ([`components/changes/ChangeRequestReadOnlyDetail.tsx`](file:///c:/ScopeGuard/components/changes/ChangeRequestReadOnlyDetail.tsx)):** Staggered fade-up entrance for historical proposal snapshots.
- **Live Impact Calculation ([`components/changes/LiveImpactPanel.tsx`](file:///c:/ScopeGuard/components/changes/LiveImpactPanel.tsx)):** Real-time formula cross-fade (`opacity: 0.5 → 1`, 150ms) as hours or rates are typed without input lag.

### 4.6 Client Approval Page
- **Approval Decision ([`components/approvals/ClientProposalView.tsx`](file:///c:/ScopeGuard/components/approvals/ClientProposalView.tsx)):**
  - Definite, reassuring SVG checkmark draw (`pathLength: 0 → 1` over 450ms) with emerald circle stroke.
  - Soft ambient pulse ring. Strictly **zero** confetti or gamified distractions.
- **Declined Decision:** Respectful, calm fade-in card (`opacity: 0 → 1, scale: 0.98 → 1`, 250ms).

### 4.7 Navigation & Drawers
- **Mobile Drawer ([`components/layout/MobileNav.tsx`](file:///c:/ScopeGuard/components/layout/MobileNav.tsx)):** Backdrop fade + spring slide-in from left (`x: -100% → 0`, `stiffness: 300, damping: 30`).
- **Sidebar ([`components/layout/Sidebar.tsx`](file:///c:/ScopeGuard/components/layout/Sidebar.tsx)):** Width transition (`w-64` ↔ `w-18`) with icon centering and accessible tooltips.

### 4.8 Form Step Transitions
- **Sign Up ([`app/(auth)/signup/SignUpForm.tsx`](file:///c:/ScopeGuard/app/(auth)/signup/SignUpForm.tsx)):** Horizontal slide (`x: -20 → 0` for form, `x: 20 → 0` for email confirmation) inside `AnimatePresence mode="wait"`.

### 4.9 Landing Page Interactive 3-Step Demo
- **Implementation ([`components/landing/LandingWorkflowExample.tsx`](file:///c:/ScopeGuard/components/landing/LandingWorkflowExample.tsx)):** Interactive 3-step walkthrough (`1. Draft Scope` → `2. Pending Approval` → `3. Client Sign-Off`). Includes sliding pill tab indicator, formula impact breakdown, and live mobile approval simulation with checkmark stroke animation.

