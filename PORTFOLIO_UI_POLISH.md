# Portfolio View UI Polish - Implementation Summary

## Changes Made (Scope-Limited):

### 1. Portfolio Summary
- ✅ Added "Waiting for Entry Amount" card
- ✅ Shows allocated capital for pending AI trades
- ✅ Reduced font sizes for cleaner look
- ✅ Improved card spacing and alignment

### 2. Stop Loss & Target
- ✅ Removed box styling (bg-red-900/20, borders)
- ✅ Kept values as clean inline text
- ✅ Columns remain in table
- ✅ No backend changes

### 3. Near SL/Target Alert
- ✅ Added subtle blinking dot when near (within ₹1)
- ✅ Price text highlights when near
- ✅ No popups or modals
- ✅ Clean and minimal

### 4. Waiting to Enter Trades Table
- ✅ Created separate visible section
- ✅ Shows: Symbol, Qty, Entry Price, Allocated Amount, Strategy, Status
- ✅ Fixed overflow with max-h-96 and scroll
- ✅ Fully visible on screen

### 5. UI Polish
- ✅ Reduced font sizes (text-xs, text-sm)
- ✅ Fixed alignment across all sections
- ✅ Improved button styling
- ✅ Better spacing consistency
- ❌ NO layout structure changes
- ❌ NO color/theme changes

## NOT Changed:
- Trading History button (untouched)
- Trading History component (untouched)
- Core logic and calculations
- Layout structure
- Color scheme

---
**Status:** Ready to implement
