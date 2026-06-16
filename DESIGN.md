# DimsaVora — Design Specification
**Version:** 1.0 | Applies to: React web dashboard

---

## Design Direction

DimsaVora is an operational tool used in motion — during active order periods, kitchen prep, and delivery. The design should feel like a well-lit kitchen command board: warm but functional, dense but scannable. All warmth comes from one source (amber), everything else is disciplined and quiet.

**Not:** a food blog, a soft consumer app, a generic admin template.  
**Is:** a focused ops dashboard for two people who know their business well and need the data fast.

---

## Color Tokens

```css
/* Base surfaces — warm bias, not cold grey */
--bg-base:      #0D0C0A;   /* page background */
--bg-surface:   #181612;   /* cards, panels, sidebar */
--bg-elevated:  #211F1B;   /* dropdowns, modals, hover rows */
--bg-muted:     #2A2722;   /* table stripes, dividers, input fill */
--border:       #302D28;   /* all borders */
--border-focus: #F5A623;   /* focused input ring */

/* Text */
--text-primary:   #EDE9E0;   /* headings, data values */
--text-secondary: #837D74;   /* labels, metadata, captions */
--text-disabled:  #4A4640;   /* placeholder, disabled state */

/* Accent — the one warm source */
--amber:         #F5A623;    /* primary CTA, active nav, highlights */
--amber-dim:     #3D2A08;    /* amber badge backgrounds, subtle fill */
--amber-muted:   #7A520F;    /* amber hover states */

/* Status colors — used only as badge/pill fills + text */
--status-unpaid:       #F59E0B;   /* orange-amber */
--status-unpaid-bg:    #2D1F04;
--status-paid:         #34D399;   /* emerald */
--status-paid-bg:      #052E1B;
--status-pending:      #9CA3AF;   /* cool grey */
--status-pending-bg:   #1E1E22;
--status-sent:         #60A5FA;   /* sky blue */
--status-sent-bg:      #0A1929;
--status-cancelled:    #F87171;   /* muted red */
--status-cancelled-bg: #2A0A0A;
```

**Rule:** Only the amber accent and the five status colors carry chromatic weight. Every other UI element lives in the warm-neutral range. No blue primary buttons, no purple gradients, no teal.

---

## Typography

### Typefaces

```
Display / headings:   Space Grotesk (Google Fonts)
                      — geometric, slightly condensed, reads well at small sizes
                      — loaded weights: 400, 500, 600

Body / UI:            Inter (Google Fonts)
                      — neutral, dense, workhorse
                      — loaded weights: 400, 500

Data / codes:         JetBrains Mono (Google Fonts)
                      — for kitchen codes, order IDs, Rupiah values, timestamps
                      — loaded weight: 400
```

### Type Scale

```
--text-xs:    11px / 1.4  — captions, table metadata, timestamps
--text-sm:    13px / 1.5  — table body, form labels, sidebar items
--text-base:  15px / 1.6  — body copy, descriptions
--text-lg:    18px / 1.4  — section headings, card titles  [Space Grotesk 500]
--text-xl:    24px / 1.2  — screen titles                   [Space Grotesk 600]
--text-2xl:   32px / 1.1  — summary card big numbers        [Space Grotesk 600]
--text-mono:  12px / 1.5  — kitchen codes, IDs, Rp values   [JetBrains Mono]
```

### Typography Rules

- All Rupiah values use `JetBrains Mono`, right-aligned in tables
- Kitchen codes (`2M6`, `1bk`) always use `JetBrains Mono` in a chip
- Headings set in `Space Grotesk 600`, body set in `Inter 400`
- Letter-spacing on table headers: `0.06em` uppercase, `--text-secondary` color
- Never use `font-weight: 700` or `800` — `600` is the maximum

---

## Spacing & Density System

The defining choice of this dashboard is **compact density**. Everything should feel like it packs more information per viewport than a default Tailwind component.

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
```

### Density Rules

| Component | Rule |
|---|---|
| Table row height | **36px** — not 48px, not 56px |
| Table cell padding | `6px 12px` |
| Card padding | `16px` — not 24px |
| Sidebar item height | `34px` |
| Form input height | `34px` |
| Modal padding | `20px` |
| Summary card padding | `16px` top/bottom, `20px` left/right |
| Section gap | `20px` between cards |
| Inline label-to-value gap | `8px` |

### Border Radius

```
--radius-sm:  3px   — chips, badges, code blocks
--radius-md:  6px   — cards, inputs, buttons, table
--radius-lg:  8px   — modals, drawers
```

No `rounded-xl`, no `rounded-2xl`, no pill shapes except status badges.

---

## Signature Element: Kitchen Code Chips

The kitchen code chip is the most distinctive element in the system. It appears in the Production Board, the Orders table, and the Kitchen Board screen.

**Spec:**

```
┌──────────────────────────────────────────────┐
│ ▌ 2M6                                        │
└──────────────────────────────────────────────┘
```

```css
.kitchen-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px 2px 6px;
  background: var(--bg-muted);
  border: 1px solid var(--border);
  border-left: 3px solid var(--amber);   /* ← the left-accent is the signature */
  border-radius: var(--radius-sm);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-primary);
  letter-spacing: 0.04em;
}
```

- Dimsum items: amber left border (default)
- Bacar items: blue left border (`var(--status-sent)`)
- Bundle items: shown decomposed, inheriting component color

**Customer label in Production Board:**

```
Aqel ─ 2M6 ▌ 1bk
```

Customer name in `--text-secondary`, chips inline after an em-dash.

---

## Component Specifications

### Tables

```
Header row:
  background: --bg-surface
  border-bottom: 1px solid --border
  font: Inter 500, 11px, uppercase, letter-spacing 0.06em
  color: --text-secondary
  padding: 0 12px
  height: 32px

Data row:
  height: 36px
  background: --bg-base (odd) / --bg-elevated (even) — subtle stripe
  border-bottom: 1px solid --border
  font: Inter 400, 13px
  color: --text-primary

  Hover: background --bg-muted, transition 80ms

Cancelled rows:
  opacity: 0.4
  text-decoration: line-through on nama_pelanggan only
```

Rupiah columns: right-aligned, `JetBrains Mono 12px`  
Action columns: right-aligned, icon buttons only (no text labels on row actions)

### Status Badges

```css
.badge {
  padding: 2px 8px;
  border-radius: 999px;    /* pill only for badges */
  font: Inter 500, 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.badge-unpaid   { color: --status-unpaid;   background: --status-unpaid-bg;   }
.badge-paid     { color: --status-paid;     background: --status-paid-bg;     }
.badge-pending  { color: --status-pending;  background: --status-pending-bg;  }
.badge-sent     { color: --status-sent;     background: --status-sent-bg;     }
.badge-cancelled{ color: --status-cancelled;background: --status-cancelled-bg;}
```

Badges are pill-shaped (`border-radius: 999px`) — the only pill shape in the UI.

### Buttons

```
Primary (amber):
  background: --amber
  color: #0D0C0A
  font: Space Grotesk 600, 13px
  height: 34px
  padding: 0 16px
  border-radius: --radius-md
  hover: background --amber-muted

Ghost:
  background: transparent
  border: 1px solid --border
  color: --text-primary
  same dimensions as primary
  hover: background --bg-muted

Destructive:
  background: transparent
  border: 1px solid --status-cancelled
  color: --status-cancelled
  hover: background --status-cancelled-bg

Icon button (row actions):
  width: 28px, height: 28px
  background: transparent
  color: --text-secondary
  border-radius: --radius-sm
  hover: background --bg-muted, color --text-primary
```

**No gradient buttons. No shadow-based elevation. Borders + background-color only.**

### Cards / Panels

```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
}

.card-header {
  font: Space Grotesk 500, 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}
```

### Summary Cards (Dashboard)

```
┌──────────────────────────────┐
│ PRODUKSI                     │  ← card-header style
│                              │
│ 7 / 10                       │  ← --text-2xl, Space Grotesk 600
│ box dimsum                   │  ← --text-xs, --text-secondary
│                              │
│ ████████░░  70%              │  ← progress bar, amber fill
└──────────────────────────────┘
```

Progress bar (for quota card only):
```css
.quota-bar {
  height: 4px;
  background: var(--bg-muted);
  border-radius: 2px;
  margin-top: 10px;
}
.quota-bar-fill {
  height: 100%;
  background: var(--amber);
  border-radius: 2px;
  transition: width 300ms ease;
}
/* Warning at >80% capacity */
.quota-bar-fill.warning { background: var(--status-unpaid); }
.quota-bar-fill.critical { background: var(--status-cancelled); }
```

### Inputs & Forms

```css
input, select, textarea {
  background: var(--bg-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font: Inter 400, 13px;
  height: 34px;
  padding: 0 12px;
  outline: none;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--amber);
  box-shadow: 0 0 0 2px var(--amber-dim);
}
textarea { height: auto; padding: 10px 12px; }

label {
  font: Inter 500, 12px;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 4px;
}
```

Toggles (for `is_free_ongkir`, status toggles):
```
OFF: background --bg-muted, border --border, knob --text-secondary
ON:  background --amber-dim, border --amber-muted, knob --amber
```

### Sidebar

```
Width: 220px, fixed
Background: --bg-surface
Border-right: 1px solid --border
Padding: 0

Header (session name):
  height: 52px
  padding: 0 16px
  border-bottom: 1px solid --border
  font: Space Grotesk 600, 14px — session name
  font: Inter 400, 11px, --text-secondary — "PO-003 · Active"

Nav items:
  height: 34px
  padding: 0 12px
  font: Inter 400, 13px
  color: --text-secondary
  border-radius: 0  (full-width, flush)
  hover: background --bg-muted, color --text-primary

Active nav item:
  color: --amber
  background: --amber-dim
  border-left: 3px solid --amber  ← same treatment as kitchen chip
  padding-left: 9px  (compensate for border)

Section label (if grouping):
  height: 28px
  padding: 0 12px
  font: Inter 500, 10px, uppercase, letter-spacing 0.08em
  color: --text-disabled
```

### Modals & Drawers

```
Modal overlay: rgba(0,0,0,0.7), backdrop-filter: blur(2px)

Modal:
  background: --bg-surface
  border: 1px solid --border
  border-radius: --radius-lg
  padding: 20px
  max-width: 480px
  width: calc(100% - 32px)

Modal header:
  font: Space Grotesk 600, 18px
  margin-bottom: 16px
  padding-bottom: 12px
  border-bottom: 1px solid --border

Order Detail Drawer:
  width: 380px
  background: --bg-surface
  border-left: 1px solid --border
  padding: 20px
  position: fixed, right 0, top 0, height 100vh
  slide-in animation: transform translateX(100%) → translateX(0), 180ms ease-out
```

### Toast Notifications

```
Position: bottom-right, 16px inset
Width: 280px
Background: --bg-elevated
Border: 1px solid --border
Border-left: 3px solid [context color]  ← same chip pattern
Border-radius: --radius-md
Padding: 10px 14px
Font: Inter 400, 13px

Success: border-left-color --status-paid
Error:   border-left-color --status-cancelled
Info:    border-left-color --amber

Auto-dismiss: 3.5s
Enter: fade in + translateY(8px → 0), 150ms
Exit:  fade out + translateY(0 → 8px), 120ms
```

---

## Screen-Specific Design Notes

### Dashboard

The Production Board grid is the hero of the screen. Give it the most vertical space.

- Summary cards: 3-column row, equal width, `gap: 16px`
- Production Board: below summary row, full width
  - Column headers (dates): `Space Grotesk 500, 12px, uppercase` with `--text-secondary`
  - Summary row (totals): `background: --amber-dim`, amber text for numbers
  - Customer rows: alternating `--bg-base` / `--bg-elevated`
  - Kitchen chips inline, no extra wrapping
- Batch Analytics: collapsed by default behind a `▾ Lihat analitik batch` toggle — don't let it push production board below fold

### Order Parser (Parse Screen)

- Left panel (textarea): 40% width, full height of content area
- Right panel (Review Form): 60% width, scrollable
- Unmatched token rows: `background: rgba(248, 113, 113, 0.06)`, small `⚠` icon in amber before the text
- Quota impact line: render as a mini progress bar inline, not just text

### Order List

No blank space in this table. Columns:

```
# (40px) | Nama (160px) | Items (chips, flex) | Jadwal (120px) | Total (90px, mono, right) | Bayar (toggle) | Kirim (toggle) | → (32px)
```

- Items column: kitchen chips inline, max 3 chips then `+N more` in `--text-secondary`
- Toggle controls: use compact toggle switches, not full badge clicks — tighter UX
- Sticky header on scroll

### Kitchen Board

Date tabs: horizontal tab bar, active tab has amber underline (2px), not a filled background.

Production summary header (per date):
```
┌──────────────────────────────────────────────────────┐
│  Rabu 17 Juni                                         │
│  9 box dimsum · 54 pcs   ·   5 cup Bacar             │
└──────────────────────────────────────────────────────┘
```
Rendered as a full-width `--amber-dim` background row with amber text for the numbers, `--text-secondary` for the labels.

### Finance Screen

Split the screen vertically:
- Left half: Expense Tracker table
- Right half: Profit Split Preview card (sticky while scrolling left side)

Preview card numbers:
- "Laba Bersih" is the largest number on screen (`--text-2xl`, amber color)
- Adit/Kila breakdown: two rows, same `--text-xl`, `--text-primary`
- "Close Batch" button: destructive style (red border), sits below the card, disabled state clearly visible

---

## Animation & Motion

Minimal. Only where it aids orientation:

| Interaction | Animation |
|---|---|
| Drawer open/close | `translateX` 180ms ease-out |
| Modal open | `scale(0.97) → scale(1)` + `opacity`, 150ms |
| Status toggle update | Color transition 120ms |
| Toast enter/exit | `translateY` + `opacity`, 150ms / 120ms |
| Optimistic revert (error) | Brief `border: 1px solid --status-cancelled` flash, 400ms |
| Row highlight (from board click) | `background: --amber-dim` pulse, 600ms, then settles |
| Production Board load | Staggered row fade-in, 20ms delay per row, 150ms each |

No looping animations. No page-load sequences. No scroll-triggered reveals — this is a tool, not a landing page.

---

## Loading & Empty States

**Loading (skeleton):**
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-muted) 0%,
    var(--bg-elevated) 50%,
    var(--bg-muted) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: var(--radius-sm);
}
```
Skeleton rows at `36px` — same height as real rows. Don't break density during load.

**Render cold start:**
Full-screen centered message:
```
[dimsum icon, 32px]
Menghubungkan ke server...
Biasanya butuh ~30 detik pertama.
[subtle amber progress bar, indeterminate]
```

**Empty tables:**
One line, `--text-secondary`, centered in the table body area:
```
Belum ada pesanan di sesi ini. Paste chat WA untuk mulai. →
```
Arrow links to /parse. No illustrations.

---

## What to Remove from the Current Build

If any of these are present in the current implementation, remove or replace them:

| Current (bland) | Replace with |
|---|---|
| White / light grey page background | `--bg-base: #0D0C0A` |
| Blue primary buttons | Amber primary buttons |
| Row height > 40px | 36px row height |
| `rounded-xl` or `rounded-2xl` cards | `border-radius: 6px` |
| `font-weight: 700` or `800` | Max `600` (Space Grotesk 600) |
| Generic grey badges | Colored status badges with matching bg |
| Plain text kitchen codes | Kitchen chips with amber left-border |
| Card `padding: 24px` or more | `padding: 16px` |
| Generous table cell padding `py-4` | `padding: 6px 12px` |
| Paragraph-style empty states | Single-line contextual empty message |
| Default Inter/sans-serif everywhere | Space Grotesk for headings, JetBrains Mono for data |
