# EOS 2.0 Prototype — Claude Instructions

## Project context

EOS Cloud is a CPQ (Configure, Price, Quote) tool built in-house for Herman Miller / MillerKnoll contract furniture dealers. EOS 2.0 is a full frontend rebuild aimed at being simpler, more engaging, and easier to pick up — stripping redundant functionality and modernising the UX.

**This repo is a React prototype** used to demo the new look & feel to users and to serve as a reference for the development team. It is not production code. Keep the code clean and well-organised but optimise for speed of iteration over engineering robustness.

**Product Owner:** Jamie Ladd (Jamie_ladd@millerknoll.com)

---

## Technology stack

- **Vite + React + TypeScript**
- **React Router v6** for client-side routing between the three pages
- **Inline styles** using the design token objects defined in `src/tokens.js` — do not introduce CSS-in-JS libraries, Tailwind, or CSS Modules unless instructed
- **No backend** — all data is mocked; the product catalog, super-products, and parsers are local JS modules

---

## Design system — EOS Cloud Component Library

All design decisions come from the **EOS Cloud Component Library** and **EOS Cloud Styleguide** Figma files located at:
`Styleguide/Figma.localfile/`

Exported CSS reference files are at:
`Styleguide/Figma.css/` — treat these as the source of truth for tokens.

### Typography

**Primary font: `Untitled Sans`** — this is the official EOS 2.0 typeface (licensed commercial font by Klim Type Foundry).

> **Font files are available** at `Styleguide/UntitledSans/` — copy these into `src/assets/fonts/` when scaffolding the project and wire up via `@font-face` in `src/tokens.css`. The fallback stack is: `'Untitled Sans', 'Helvetica Neue', Arial, sans-serif`. Note: the Figma source files still reference `Meta Offc` — this has been superseded by `Untitled Sans`.

**Available weights:**

| File | Weight | CSS `font-weight` |
|------|--------|-------------------|
| `UNTITLEDSANS-LIGHT.OTF` | Light | 300 |
| `UNTITLEDSANS-REGULAR.OTF` | Regular | 400 |
| `UNTITLEDSANS-MEDIUM.OTF` | Medium | 500 |
| `UNTITLEDSANS-BOLD.OTF` | Bold | 700 |

**`@font-face` declarations** (goes in `src/tokens.css`):
```css
@font-face {
  font-family: 'Untitled Sans';
  src: url('./assets/fonts/UNTITLEDSANS-LIGHT.OTF') format('opentype');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Untitled Sans';
  src: url('./assets/fonts/UNTITLEDSANS-REGULAR.OTF') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Untitled Sans';
  src: url('./assets/fonts/UNTITLEDSANS-MEDIUM.OTF') format('opentype');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Untitled Sans';
  src: url('./assets/fonts/UNTITLEDSANS-BOLD.OTF') format('opentype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

**Type scale (desktop):**

| Name | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|--------|-------------|----------------|-------|
| Display | 118.88px | 700 | 110% | -0.03em | Page heroes |
| H1 | ~68.8px | 700 | 110% | -0.02em | Page titles |
| H4 | 33.18px | 700 | 120% | — | Section headers |
| UI Default Bold | 16px | 700 | 120% | 0.01em | Buttons, labels |
| UI Default Regular | 16px | 500 | 120% | 0.01em | Body text |
| UI Small Bold Uppercase | 13.33px | 700 | 120% | 0.01em | Uppercase labels, column headers |
| UI Small (mobile) | 11.11px | 700 | 120% | 0.01em | Mobile small |

In code, use the token objects from `src/tokens.js`:
```js
sBody   // { fontWeight: 500, fontSize: 13.33, lineHeight: 1.2, letterSpacing: '0.01em' }
sBodyB  // { fontWeight: 700, fontSize: 13.33, lineHeight: 1.2, letterSpacing: '0.01em' }
sLargeB // { fontWeight: 700, fontSize: 16, lineHeight: 1.2, letterSpacing: '0.01em' }
sLargeM // { fontWeight: 500, fontSize: 16, lineHeight: 1.2, letterSpacing: '0.01em' }
```

---

### Colour tokens

All colours are defined as CSS custom properties in `src/tokens.css` and mirrored as a JS object in `src/tokens.js`. Always reference tokens — never hard-code hex values in components.

#### Brand

| Token | Value | Usage |
|-------|-------|-------|
| `--brand` | `#E22D00` | Primary CTA buttons, active states, focus rings, brand mark |
| `--brand-dark` | `#A81910` | Button hover state |
| `--brand-darker` | `#601B15` | Pressed state |
| `--brand-soft` | `#FFF6F4` | Selected row backgrounds, soft brand tint (= Pink-5) |

#### Neutrals

| Token | Value | Usage |
|-------|-------|-------|
| `--ink` | `#252525` | Primary text (Off-Black) |
| `--ink-select` | `#333333` | Off-Black Select — hover/active text |
| `--ink-2` | `#616161` | Secondary text (Gray Dark) |
| `--ink-3` | `#ACACAC` | Tertiary / placeholder / inactive (Gray Mid) |
| `--line` | `#EBEBEB` | Cell borders, hover backgrounds (Gray Light) |
| `--bg` | `#FFFFFF` | Page / card background |
| `--bg-soft` | `#FAFAFA` | Off-White global background |
| `--black` | `#1B1B1B` | True black (tooltip borders, etc.) |
| `--ink-deep` | `#090909` | Off-Black — top nav bottom border |

#### Pin lines

| Token | Value | Usage |
|-------|-------|-------|
| `--pin` | `rgba(9,9,9,0.15)` | Subtle dividers on light backgrounds |
| `--pin-light` | `rgba(255,255,255,0.2)` | Dividers on dark backgrounds |

#### Utility / Status

| Token | Value | Usage |
|-------|-------|-------|
| `--green` | `#00816C` | Success, Confirmed, Completed (Green-50) |
| `--green-soft` | `#E7EDEE` | Success background (Blue-10 — as per Figma) |
| `--blue` | `#28628E` | In Progress, Invoiced, info states (Blue-50) |
| `--blue-soft` | `#DCE7EF` | Info background |
| `--amber` | `#CE973D` | Warning, Pending (Yellow-50) |
| `--amber-soft` | `#F6F4EA` | Warning background (Yellow-5) |
| `--red` | `#CD4557` | Error, Cancelled, On Hold (Pink-50) |
| `--red-soft` | `#FFF6F4` | Error background (Pink-5) |
| `--yellow` | `#F8DE84` | Avatar background (Yellow-20) |

#### Experience colour palette

The full palette has 7 colour families (Blue, Green, Lavender, Orange, Pink, Teal, Yellow), each in 9 shades (5–90). Use sparingly for data visualisation, category tags, and decorative elements. The -50 shade is the "base" for each family; lighter shades (5–15) are soft backgrounds; darker shades (60–90) are text on light backgrounds.

Key values:

| Family | 5 | 10 | 20 | 50 | 60 |
|--------|---|----|----|----|----|
| Blue | `#F3F5F5` | `#E7EDEE` | `#B0CED8` | `#28628E` | `#2F5179` |
| Green | `#ECF1EE` | `#E4EFE9` | `#B6D3C2` | `#00816C` | `#216958` |
| Lavender | `#F0EDEE` | `#EFE7EA` | `#E0CFD6` | `#876B8B` | `#6E5A6B` |
| Orange | `#F8F1EE` | `#F9EBE2` | `#FECAA5` | `#BE572A` | `#96431F` |
| Pink | `#FFF6F4` | `#FBE8E7` | `#EFC9C6` | `#CD4557` | `#8A223B` |
| Teal | `#EFF6F9` | `#E0F1F6` | `#BFE3ED` | `#007E94` | `#006B7D` |
| Yellow | `#F6F4EA` | `#F1ECDC` | `#F8DE84` | `#CE973D` | `#926D53` |

---

### Spacing & sizing

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `4px` | Default border radius (Figma spec — note: prototype used 5px, corrected to 4px) |
| Hit area | `44px` | Minimum touch/click target for all interactive elements |
| Row height | `50px` | Table rows |
| Tab height | `55px` | Tab bar, search bar, primary buttons |
| Top nav height | `92px` | Sticky top navigation |
| Footer height | `72px` | Page footer |
| Page max-width | `1408px` | Main content container |
| Page padding | `40px` | Horizontal padding on main |

#### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-pop` | `8px 8px 32px rgba(0,0,0,0.15)` | Popovers, menus, drawers |
| `--shadow-sm` | `1px 1px 16px rgba(0,0,0,0.1)` | Subtle card elevation |

---

### Component patterns

#### Buttons

- **Primary (Fill):** `background: var(--brand)`, white text, `border: 2px solid var(--brand)`, `border-radius: var(--radius)`, height 50–55px. Hover: `background: var(--brand-dark)` (`#A81910`)
- **Stroke (Ghost):** `background: transparent`, `border: 2px solid var(--ink)`, `color: var(--ink)`. Hover: `background: var(--brand)`, white text, `border-color: var(--brand)`
- **Disabled:** `background: var(--line)`, `color: var(--ink-3)`, `border-color: var(--line)`, `cursor: not-allowed`
- All buttons use `sLargeB` type (16px bold) unless in a compact context

#### Inputs & form fields

- Border: `2px solid var(--ink)` at rest, `2px solid var(--brand)` on focus
- Height: `44px` (compact) or `55px` (full-size)
- `border-radius: var(--radius)`
- Focus ring: `box-shadow: 0 0 0 4px rgba(226,45,0,0.08)` in addition to border change
- Label style: `sBodyB` in `--ink-2`, uppercase, `letter-spacing: 0.6`
- Disabled: `opacity: 0.5`

#### Checkboxes

- Box size: `18px × 18px`, `border-radius: 2px`
- Inactive border: `1px solid var(--ink-2)` (dark theme: `1px solid var(--line)`)
- Hover: `border: 2px solid var(--ink-select)` (`#333333`)
- Active/checked: `background: var(--ink)` or `background: var(--brand)` (tables use brand)
- Touch target wrapper: `44px × 44px`

#### Radio buttons

- Inner dot size: `20px × 20px`
- Touch target: `44px × 44px`
- Active: `background: var(--ink)`; Light variant: `background: var(--bg)`

#### Status indicators

Dot + text inline pattern:
```jsx
<span style={{ width: 8, height: 8, borderRadius: 4, background: color.dot }} />
<span style={{ color: color.fg }}>{status}</span>
```

Status colour map:
- Confirmed / Completed / Delivered → Green-50 / Green-10
- In Progress / Invoiced / Submitted → Blue-50 / Blue-10
- Pending / On Hold → Yellow-50 / Yellow-5 (text: `#8A6D1E`)
- Cancelled / On Hold (error) → Pink-50 / Pink-5
- Archived → Gray Dark / Gray Light
- Draft → `--line` / `--ink`

#### Notification messages

- `border-radius: 4px`
- Info: `background: #E7EDEE` (Blue-10), text `#283D28`
- Error/Warning: `background: #F7F0F1` (Pink-soft), text `#8A223B` (Pink-60)
- Warning (amber): `background: #F6F4EA` (Yellow-5), text `#926D53` (Yellow-60)
- Height: `51px` (single line) / `70px` (two lines)
- Close icon: `14px`, touch target `44px`

#### Navigation drawer

- Width: `360px`, slides in from left with `transform: translateX(-100%) → (0)`
- Backdrop: `rgba(9,9,9,0.32)`, fades in/out
- Header: `92px` tall, matches top nav height
- Active nav item: `border: 2px solid var(--brand)`, `background: var(--brand-soft)`
- Transition: `0.25s cubic-bezier(.4,0,.2,1)`

#### Table headers

- `background: var(--ink)` (`#252525`)
- Text: white, `sBodyB`, `fontSize: 12.5`
- Sort icons: opacity 0.55 (inactive) → 1 (active)

#### Modals / pop-up menus

- `border: 2px solid #000`, `border-radius: var(--radius)`
- `box-shadow: var(--shadow-pop)`
- Animation: `menuPop .14s cubic-bezier(.4,0,.2,1)` (slight scale + translateY)

---

### Motion

| Use case | Duration | Easing |
|----------|----------|--------|
| Colour / opacity transitions | `0.15s` | `ease` |
| Toggle / switch | `0.2s` | `ease` |
| Slide-in panels / filters | `0.2s` | `ease` |
| Nav drawer | `0.25s` | `cubic-bezier(.4,0,.2,1)` |
| Menu pop | `0.14s` | `cubic-bezier(.4,0,.2,1)` |
| Toast in | `0.2s` | `cubic-bezier(.4,0,.2,1)` |

---

## Coding guidelines

### Styling

- All styling uses **inline styles** with token references. Never hard-code colour hex values directly in JSX.
- The token object `T` (or imported from `src/tokens.js`) provides the canonical values.
- CSS custom properties in `src/tokens.css` are the CSS-side source of truth and are referenced in the global stylesheet for any CSS class-based styles (hover states, focus-visible, animations).
- Hover/focus states that cannot be done inline go in a `<style>` block within the component or in a global CSS file — use class names prefixed `eos-` to avoid collisions.
- `::selection`: `background: var(--ink); color: #fff`
- `button:focus-visible, a:focus-visible`: `outline: 2px solid var(--brand); outline-offset: 2px`

### Components

- Shared components live in `src/components/`
- Page-level components live in `src/pages/<PageName>/`
- Data / mock data lives in `src/data/`
- Parser utilities live in `src/utils/`
- Do not create new abstractions unless a pattern appears in 3+ places
- Keep components focused — a component that renders a table row should not also manage sort state

### Routing

- React Router v6 with `createBrowserRouter`
- Routes: `/` → Import, `/orders` → Order List, `/orders/:id` → Order Detail
- Pass order data via React Router `state` (replaces the `localStorage` hack from the prototype)
- Keep `localStorage` persistence only for "Save Draft" functionality on Order Detail

### Do not

- TypeScript is used throughout — all files are `.tsx` / `.ts`
- Do not add a component library (MUI, Ant Design, shadcn, etc.)
- Do not add a state management library (Redux, Zustand, etc.) — React `useState`/`useContext` is sufficient
- Do not add CSS frameworks (Tailwind, Bootstrap, etc.)
- Do not implement features or pages beyond what Jamie instructs — only polish and migrate existing functionality
- Do not change the visual design without explicit instruction — the prototype is the reference
- Do not create documentation files (README, etc.) unless asked

---

## Known discrepancies: prototype vs Figma spec

These are differences found between the existing prototype code and the Figma style guide. Correct them when touching the relevant components:

| Area | Prototype | Figma spec | Action |
|------|-----------|------------|--------|
| Font | `Inter` | `Untitled Sans` (Klim) | OTF files available in `Styleguide/UntitledSans/` — wire up on project scaffold |
| Border radius | `5px` | `4px` | Use `4px` (`var(--radius)`) going forward |
| `--red` (error) | `#C84757` | `#CD4557` (Pink-50) | Update token |
| `--amber` (warning) | `#B0843D` | `#CE973D` (Yellow-50) | Update token |
| `--blue` (info) | `#28628E` | `#28628E` (Blue-50) | ✓ Match |
| `--green` (success) | `#00816C` | `#00816C` (Green-50) | ✓ Match |
| Brand red | `#E22D00` | `#E22D00` | ✓ Match |
| `--ink` (Off-Black) | `#252525` | `#252525` | ✓ Match |

---

## Page overview

### Import (`/`)
File upload (OBX, SIF, TXT, XLSX) + paste article codes → basket → create order.
Key components: `FileDropZone`, `ArticleInput`, `ColumnMapper`, `BasketTable`.

### Order List (`/orders`)
Tabbed list (Active / Completed / Archived) with search, filters, sort, bulk actions.
Key components: `OrdersTable`, `FiltersPanel`, `BulkActionBar`, `TabsPill`.

### Order Detail (`/orders/:id`)
Editable order header + 5-tab strip (only Order Lines is built; others are placeholders).
Key components: `OrderHeader`, `TabStrip`, `OrderLinesTable`, `LineBlock`, `ActionBar`.
