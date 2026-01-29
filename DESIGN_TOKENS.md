# ZAKI Design Tokens

A systematic design language for ZAKI's warm desert aesthetic.

## Quick Reference

### Text Colors

| Token | Usage | Light | Dark |
|-------|-------|-------|------|
| `--zaki-text-primary` | Headings, primary content | `#1f1a14` | `#efe6d9` |
| `--zaki-text-secondary` | Body text, descriptions | `#655543` | `#c8b6a0` |
| `--zaki-text-muted` | Labels, hints | `#88735A` | `#a18b73` |
| `--zaki-text-disabled` | Disabled states | `#a3a3a3` | `#6b5d4d` |
| `--zaki-brand` | Accent, links, CTAs | `#D24430` | `#D24430` |

**Classes:** `text-zaki-primary`, `text-zaki-secondary`, `text-zaki-muted`, `text-zaki-brand`

### Surfaces

| Token | Usage | Light | Dark |
|-------|-------|-------|------|
| `--zaki-surface-base` | Main background | `#ffffff` | `#0f0b08` |
| `--zaki-surface-raised` | Inputs, slightly elevated | `#fffdfa` | `#15100c` |
| `--zaki-surface-elevated` | Cards, modals | `#faf6f0` | `#21180f` |
| `--zaki-surface-sunken` | Code blocks, inset areas | `#f6efe6` | `#2b2119` |

**Classes:** `bg-zaki-base`, `bg-zaki-raised`, `bg-zaki-elevated`, `bg-zaki-sunken`

### Borders

| Token | Usage |
|-------|-------|
| `--zaki-border-default` | Standard borders |
| `--zaki-border-subtle` | Lighter, less prominent |
| `--zaki-border-strong` | Emphasized, inputs on focus |
| `--zaki-border-focus` | Focus rings (brand color) |

**Classes:** `border-zaki`, `border-zaki-subtle`, `border-zaki-strong`

### Interactive States

| Token | Usage |
|-------|-------|
| `--zaki-hover` | Hover background |
| `--zaki-active` | Active/pressed background |
| `--zaki-selected` | Selected item background |

**Classes:** `bg-zaki-hover`, `hover:bg-zaki-hover`, `bg-zaki-active`, `bg-zaki-selected`

### Shadows (Elevation)

| Token | Usage | Value |
|-------|-------|-------|
| `--zaki-shadow-sm` | Subtle elevation | `0px 4px 12px rgba(15,15,15,0.04)` |
| `--zaki-shadow-md` | Cards, dropdowns | `0px 14px 30px rgba(15,15,15,0.08)` |
| `--zaki-shadow-lg` | Popovers | `0px 18px 40px rgba(15,15,15,0.08)` |
| `--zaki-shadow-xl` | Modals | `0px 24px 60px rgba(15,15,15,0.18)` |

**Classes:** `shadow-zaki-sm`, `shadow-zaki-md`, `shadow-zaki-lg`, `shadow-zaki-xl`

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--zaki-radius-sm` | 8px | Small elements, tags |
| `--zaki-radius-md` | 12px | Buttons, inputs, menu items |
| `--zaki-radius-lg` | 16px | Cards, message bubbles |
| `--zaki-radius-xl` | 22px | Input area, large cards |
| `--zaki-radius-2xl` | 24px | Modals |
| `--zaki-radius-full` | 9999px | Pills, avatars |

**Classes:** `rounded-zaki-sm`, `rounded-zaki-md`, `rounded-zaki-lg`, `rounded-zaki-xl`

### Spacing Scale

| Token | Value |
|-------|-------|
| `--zaki-space-1` | 4px |
| `--zaki-space-2` | 8px |
| `--zaki-space-3` | 12px |
| `--zaki-space-4` | 16px |
| `--zaki-space-5` | 20px |
| `--zaki-space-6` | 24px |
| `--zaki-space-8` | 32px |
| `--zaki-space-10` | 40px |
| `--zaki-space-12` | 48px |

Use with Tailwind: `p-4`, `gap-6`, `m-8` (Tailwind uses the same scale)

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--zaki-text-xs` | 12px | Captions, labels |
| `--zaki-text-sm` | 14px | Secondary text |
| `--zaki-text-base` | 16px | Body text |
| `--zaki-text-lg` | 18px | Card titles |
| `--zaki-text-xl` | 20px | Section headings |
| `--zaki-text-2xl` | 24px | Page titles |

Use with Tailwind: `text-xs`, `text-sm`, `text-base`, etc.

### Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--zaki-transition-fast` | 150ms ease | Hover states, focus |
| `--zaki-transition-base` | 200ms ease | General transitions |
| `--zaki-transition-slow` | 300ms ease | Sidebar, modals |

**Classes:** `transition-zaki-fast`, `transition-zaki-base`, `transition-zaki-slow`

### Brand Opacity Variants

| Token | Usage |
|-------|-------|
| `--zaki-brand-10` | Very subtle brand background |
| `--zaki-brand-15` | Subtle brand background |
| `--zaki-brand-20` | Light brand background |

**Classes:** `bg-zaki-brand-10`, `bg-zaki-brand-15`, `bg-zaki-brand-20`, `hover:bg-zaki-brand-20`

### Dark Mode Utilities

| Class | Usage |
|-------|-------|
| `dark:bg-zaki-dark-hover` | Dark mode hover background |
| `dark:bg-zaki-dark-card` | Dark mode card background |
| `dark:bg-zaki-dark-elevated` | Dark mode elevated surface |
| `dark:text-zaki-dark-muted` | Dark mode muted text |
| `dark:text-zaki-dark-subtle` | Dark mode subtle text |
| `dark:border-zaki-dark` | Dark mode borders |

### Info State (Toasts)

| Class | Usage |
|-------|-------|
| `bg-zaki-info` | Info toast background |
| `border-zaki-info` | Info toast border |
| `text-zaki-info` | Info toast text |

### Gradient

| Class | Usage |
|-------|-------|
| `bg-zaki-gradient` | Brand gradient (logo backgrounds) |

### Form Elements

| Class | Usage |
|-------|-------|
| `placeholder-zaki` | Input placeholder text |
| `placeholder-zaki-muted` | Muted placeholder text |
| `accent-zaki` | Checkbox/radio accent color |

---

## Component Classes

Pre-built component patterns using design tokens:

### Buttons

```html
<!-- Primary (brand color) -->
<button class="zaki-button-primary">Submit</button>

<!-- Secondary (outlined) -->
<button class="zaki-button-secondary">Cancel</button>

<!-- Ghost (minimal) -->
<button class="zaki-button-ghost">Settings</button>
```

### Cards

```html
<div class="zaki-card p-5">
  Card content
</div>
```

### Inputs

```html
<input class="zaki-input" placeholder="Enter text..." />
```

### Menu Items

```html
<button class="zaki-menu-item">
  <IconSettings /> Settings
</button>

<button class="zaki-menu-item zaki-menu-item-danger">
  <IconTrash /> Delete
</button>
```

### Focus Ring

```html
<button class="zaki-focus-ring">Accessible Button</button>
```

---

## Migration Guide

Replace hardcoded values with tokens:

### Before (Don't)
```tsx
<div className="text-[#1f1a14] bg-[#faf6f0] border-[#efe4d6] rounded-2xl shadow-[0px_14px_30px_rgba(15,15,15,0.08)]">
```

### After (Do)
```tsx
<div className="text-zaki-primary bg-zaki-elevated border-zaki rounded-zaki-lg shadow-zaki-md">
```

Or use CSS variables directly:
```tsx
<div style={{ color: 'var(--zaki-text-primary)' }}>
```

---

## Dark Mode

All tokens automatically switch in dark mode via the `.dark` class on the root element.

**Important:** Tokens are designed to work in both modes. Using them ensures consistent theming.

---

## Z-Index Layers

| Token | Value | Usage |
|-------|-------|-------|
| `--zaki-z-base` | 0 | Normal content |
| `--zaki-z-dropdown` | 10 | Dropdowns, menus |
| `--zaki-z-sticky` | 20 | Sticky headers |
| `--zaki-z-modal` | 50 | Modals, dialogs |
| `--zaki-z-toast` | 60 | Toast notifications |
| `--zaki-z-tooltip` | 70 | Tooltips (topmost) |

---

## Accessibility

Tokens include:
- **Reduced motion support** — Animations disabled when `prefers-reduced-motion: reduce`
- **Skip link class** — `.zaki-skip-link` for keyboard navigation
- **Screen reader only** — `.zaki-sr-only` for hidden but accessible text
- **Focus ring** — `.zaki-focus-ring` for visible keyboard focus

---

## File Location

Tokens are defined in:
```
src/styles/tokens.css
```

Imported via:
```
src/styles/index.css
```
