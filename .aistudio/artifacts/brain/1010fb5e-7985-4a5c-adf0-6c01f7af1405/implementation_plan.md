# Implementation Plan: Heritage Luxury Redesign

Transform the application and visual branding into a **Heritage Luxury** aesthetic featuring **matte charcoal**, **warm ivory**, and **champagne gold**, anchored by a **classical serif monogram** logo with balanced Roman proportions.

## Key Changes

1. **Brand Identity & Vector Assets (`honeymoney-icon.svg`, `honeymoney-logo.svg`, `app-drawer-preview.html`)**:
   - **Classical Serif Monogram**: Sculpted Roman serif "H" with refined calligraphic stroke contrast (slender bracketed serifs, stately vertical stems, refined crossbar).
   - **Colors**: Matte charcoal circular/squircle backdrop (`#15171B`), champagne gold hairline rim (`#D4AF37` to `#E8D39E`), and warm ivory/champagne gold letterforms.
   - **Brand Typography**: Editorial serif and clean tracking ("Honeymoney" with "PRIVATE WEALTH & SPENDING MEMORY").

2. **Application UI Theme (Matte Charcoal & Champagne Gold)**:
   - **Backgrounds**: Deep matte charcoal (`#0E1013` app shell, `#14171C` container).
   - **Cards & Surfaces**: Warm slate charcoal (`#1A1D24`, `#20242D`) with fine hairline borders (`#2B303C`).
   - **Accents**: Champagne gold (`#D4AF37` / `#DFBF70` / `#C5A059`) for primary active states, totals, and indicators.
   - **Text**: Warm ivory headings (`#F7F5F0`), stone white text (`#E2DFD8`), and muted taupe-gray captions (`#9E9A90`).

3. **Navigation & Headers**:
   - Update top-left header badge to the refined classical serif emblem.
   - Restyle bottom navigation and floating action button in matte charcoal with champagne gold accents.

## Verification Plan

- `compile_applet` & `lint_applet` to confirm zero errors.
- Visual inspection of the vector icons and phone app drawer simulation.
