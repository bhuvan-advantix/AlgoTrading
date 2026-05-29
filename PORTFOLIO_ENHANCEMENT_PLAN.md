# Portfolio View Enhancement Implementation Plan

## Changes to Implement:

### 1️⃣ Portfolio Summary – Add "Waiting for Entry Amount"
- Calculate total allocated amount for pending AI stocks
- Add new summary card between "Current Value" and "Brokerage"
- Show: "⏳ Waiting Entry" with allocated amount
- No calculation changes, display only

### 2️⃣ "Waiting to Enter Trade" – Separate Table
- Move from compact cards to full table format
- Columns: Symbol, Qty, Entry Price, Allocated, Strategy, Status
- Reuse existing table styles
- Place AFTER portfolio summary, BEFORE tabs

### 3️⃣ Stop Loss & Target – Remove Box UI
- Remove: bg-red-900/20, bg-green-900/20, borders, padding
- Keep: Values, columns, data
- Display as: Simple text with emoji (🛑 ₹168.28 -1.2%)

### 4️⃣ Near SL/Target Alert – Subtle Indicator
- Add small pulsing dot (🔴 or 🟢) next to price
- Only when within 2% of SL/Target
- No boxes, no badges, just a dot
- Minimal and clean

### 5️⃣ UI Polish
- Reduce font sizes (text-sm → text-xs)
- Improve button styling (add shadows, better hover)
- Fix table alignment
- Consistent spacing

## Implementation Order:
1. Add "Waiting Entry" card to summary
2. Convert waiting section to table format
3. Remove SL/Target boxes
4. Add subtle near alerts
5. Polish UI elements

---
**Status:** Ready to implement
**Estimated Changes:** ~200 lines
