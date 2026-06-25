# Redesign: Tailwind + @blibliki/ui

**Date:** 2026-06-25  
**Goal:** Replace hand-rolled CSS with @blibliki/ui components and Tailwind utilities, mirroring the grid app's technical setup and aesthetic.

---

## 1. Dependencies & Build Setup

### Add to `package.json`
- `@blibliki/ui`: `file:../blibliki/packages/ui` (not on npm)
- `tailwindcss` + `@tailwindcss/vite`
- `clsx` + `tailwind-merge` (for `cn` utility)

### `vite.config.ts`
Add `tailwindcss()` vite plugin (same as grid).

### CSS entry
Replace `src/style.css` with `src/styles/index.css`:
```css
@import "./tailwind.css";
@import "@blibliki/ui/styles.css";
@import "./app.css";
```
- `tailwind.css` — `@import "tailwindcss"` + `@theme inline` bridging `--ui-color-*` tokens to Tailwind utilities
- `app.css` — glijs-specific layout: canvas stage, bottom-drawer slide animation only

---

## 2. Theme & Provider

### `src/theme/uiTheme.ts`
`createTheme()` with the same slate dark palette as grid (slate-950/900/800 surfaces, slate-100 text, blue-400 primary).

### `src/main.tsx`
- Add `dark` class to `<html>` immediately (glijs is always dark — no toggle)
- Wrap app in `UIProvider` with `mode="dark"` and the theme
- Apply `themeToCssVariables(theme, "dark")` to `document.documentElement.style` on mount (so portaled UI like dropdowns gets tokens too)

No `MutationObserver` / `useColorScheme` complexity — glijs is dark-only.

### `src/styles/tailwind.css`
Same `@theme inline` block as grid: bridges `--ui-color-*` and `--ui-radius-*` into Tailwind utilities (`bg-surface-panel`, `text-content-muted`, `border-border-subtle`, `rounded-md`, etc.).

---

## 3. Component Mapping in `App.tsx`

| Current | Replacement |
|---|---|
| `input[type="range"]` | `Fader` from @blibliki/ui |
| `input[type="checkbox"]` (Enable / Solo) | `Switch` from @blibliki/ui |
| `select` (mode, shape, audio source, device) | `Select` from @blibliki/ui |
| Transport buttons (Play, Record, Render) | `Button` (contained / outlined variant) |
| Info tooltip `<span>` | stays custom (no tooltip primitive in @blibliki/ui) |

Layout rebuilt with Tailwind utilities throughout (`flex`, `grid`, `gap-*`, `px-*`, etc.).

---

## 4. What Gets Deleted

All of `src/style.css` except:
- Canvas/stage full-screen layout
- Bottom-drawer slide animation (`translateY` transition, `is-open` state)

All hand-rolled component CSS is removed: `.slider-field`, `.toggle-field`, `.settings-tab`, `.transport__button`, `.select-field`, `.file-field`, `.filter-order`, `.control-group`, etc.

---

## Out of Scope

- Light mode toggle (glijs is always dark)
- Theme preset switching (no need for multiple presets)
- shadcn compatibility tokens (not using shadcn here)
