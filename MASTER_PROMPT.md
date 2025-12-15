# 🎯 MASTER PROMPT - AI Trading System Implementation

## ✅ FINAL MASTER PROMPT (USE AS-IS)

**Context & Constraints (DO NOT IGNORE):**

* Project already exists
* `SimpleAITrading.jsx` is already modified partially
* DO NOT remove existing working logic
* Only enhance, complete, and fix missing parts
* Everything must work end-to-end
* NSE stocks only (`.NS` mandatory)
* Use **Yahoo Finance** for OHLCV (last 1 month)
* Use **Finnhub** for news (last 1 month)
* No dummy data, no placeholders
* UI must be **simple, modern, professional**
* AI is an **idea generator only**, NOT decision maker

---

## 🎯 OBJECTIVE

Complete and redesign **AI Trading → Intraday Paper Trading** so that:

1. AI suggests **maximum 5 stocks**
2. Stocks are ranked using a **100-point multi-factor scoring system**
3. Capital allocation follows the **exact Stock Allocation Algorithm provided**
4. Orders are placed in **paper trading only**
5. Allocation is **perfectly proportional** (₹1L ≠ full ₹1L per stock)
6. UI works like a **customizable To-Do list**
7. Entire flow is **testable for 1 month performance**

---

## 🧠 AI RESPONSIBILITY (STRICT)

AI must ONLY:

* Suggest **candidate stocks (ideas)**
* Provide **signal strength score**
* Provide **bias (bullish / neutral / bearish)**

AI must NOT:

* Decide position size
* Decide stop-loss
* Decide take-profit
* Execute trades

All execution decisions come from **our algorithm**.

---

## 📊 STOCK SELECTION & SCORING (MANDATORY)

Implement the **100-point scoring model**:

* Global news sentiment (20)
* US close & Asia open trend (20)
* Stock-specific news sentiment (20)
* Technical momentum & volatility (20)
* Fundamentals (PE, market cap, 52W position) (20)

Only stocks scoring **above a configurable threshold** are selectable.

Limit final list to **MAX 5 NSE stocks**.

---

## 💰 CAPITAL ALLOCATION (MANDATORY – NO SHORTCUTS)

Implement the **Stock Allocation Algorithm for Intraday Trading EXACTLY as provided**, including:

* Inputs:

  * Total capital `C` (example: ₹1,00,000 or ₹1,000)
  * Basket loss % `L%`
  * Basket profit % `G%`
  * Risk-reward ratio `R`
  * Stop % `s%`
  * Capital cap per stock `c%`
  * AI signal strength weights `w_i`

* Must follow ALL steps:

  1. Normalize weights
  2. Per-stock loss cap
  3. Entry, stop, target calculation
  4. Raw quantity from risk
  5. Capital cap per stock
  6. Total capital check & scaling
  7. Basket-level loss & profit validation

❗ Important:

* ₹1L should NOT be allocated as ₹1L × 5 stocks
* ₹1,000 should still allocate proportionally
* Floor quantities (no over-allocation)
* If capital under-deploys, show it transparently

---

## 📈 MARKET DATA

* **OHLCV**: Yahoo Finance, last **1 month**, intraday-relevant resolution
* **News**: Finnhub, last **1 month**
* Symbols must be `TICKER.NS`
* Cache data efficiently (no repeated calls)

---

## 📝 UI / UX REQUIREMENTS

Redesign `SimpleAITrading.jsx` to behave like a **To-Do List**:

Each stock card should support:

* Add / Remove stock
* Enable / Disable trade
* Edit parameters (L%, G%, s%, R, c%)
* Re-run allocation instantly
* Show:

  * Score breakdown
  * Entry / Stop / Target
  * Quantity
  * Capital used
  * Expected P&L

UI Style:

* Minimal
* Professional
* Modern
* No clutter
* No trading-terminal look

---

## 🧪 PAPER TRADING FLOW

* Place trades ONLY in paper mode
* Track:

  * Entry time
  * Exit (stop / target / time-based)
  * P&L per trade
  * Basket P&L
* Auto-close after 2–3 hours or EOD
* Maintain trade log for expectancy calculation

---

## 📊 PERFORMANCE & LEARNING

* Use trade logs to compute:

  * Win rate
  * Avg win / Avg loss
  * Expectancy
* Convert expectancy into **signal strength**
* Normalize into weights `w_i`
* Update weights **daily / weekly**, not live

---

## ✅ FINAL DELIVERABLE EXPECTATION

After implementation:

* I can set capital (₹1,000 or ₹1,00,000)
* AI suggests up to 5 NSE stocks
* Allocation is mathematically correct
* Paper trades execute correctly
* UI is clean and usable
* No missing links, no manual steps

**Do not explain theory.
Do not rewrite the whole app.
Implement, integrate, test, and ensure correctness.**

---

## 📐 STOCK ALLOCATION ALGORITHM (EXACT IMPLEMENTATION)

### Inputs
```
C = Total capital (₹)
L% = Basket loss percentage (e.g., 2%)
G% = Basket profit percentage (e.g., 5%)
R = Risk-reward ratio (e.g., 2.5)
s% = Stop loss percentage per stock (e.g., 1%)
c% = Capital cap per stock (e.g., 30%)
w_i = AI signal strength weights for each stock
```

### Step 1: Normalize Weights
```
W_total = Σ w_i
w_i_norm = w_i / W_total
```

### Step 2: Per-Stock Loss Cap
```
L_i = C × L% × w_i_norm
```

### Step 3: Entry, Stop, Target Calculation
```
Entry_i = Current market price
Stop_i = Entry_i × (1 - s%)
Target_i = Entry_i + (Entry_i - Stop_i) × R
```

### Step 4: Raw Quantity from Risk
```
Risk_per_share = Entry_i - Stop_i
Q_raw_i = L_i / Risk_per_share
```

### Step 5: Capital Cap Per Stock
```
Cap_i = C × c%
Q_capped_i = min(Q_raw_i, Cap_i / Entry_i)
Q_i = floor(Q_capped_i)
```

### Step 6: Total Capital Check & Scaling
```
Capital_used = Σ (Q_i × Entry_i)

If Capital_used > C:
    scale = C / Capital_used
    Q_i = floor(Q_i × scale) for all i
```

### Step 7: Basket-Level Loss & Profit Validation
```
Total_loss = Σ (Q_i × (Entry_i - Stop_i))
Total_profit = Σ (Q_i × (Target_i - Entry_i))

Verify:
    Total_loss ≤ C × L%
    Total_profit ≥ C × G%
```

### Output
```
For each stock i:
    - Symbol
    - Quantity Q_i
    - Entry price
    - Stop loss
    - Target
    - Capital allocated
    - Expected loss
    - Expected profit
```

---

## 🎨 UI COMPONENT STRUCTURE

```jsx
<AITradingPanel>
  <ConfigSection>
    <Input label="Capital" value={C} />
    <Input label="Basket Loss %" value={L} />
    <Input label="Basket Profit %" value={G} />
    <Input label="Risk-Reward" value={R} />
    <Input label="Stop %" value={s} />
    <Input label="Cap %" value={c} />
    <Button>Get AI Recommendations</Button>
  </ConfigSection>

  <StockList>
    {stocks.map(stock => (
      <StockCard key={stock.symbol}>
        <Header>
          <Symbol>{stock.symbol}</Symbol>
          <Score>{stock.aiScore}/100</Score>
          <Toggle enabled={stock.enabled} />
          <RemoveButton />
        </Header>
        
        <ScoreBreakdown>
          <Item>Global News: {stock.globalNews}/20</Item>
          <Item>US/Asia Trend: {stock.usTrend}/20</Item>
          <Item>Stock News: {stock.stockNews}/20</Item>
          <Item>Technical: {stock.technical}/20</Item>
          <Item>Fundamentals: {stock.fundamentals}/20</Item>
        </ScoreBreakdown>
        
        <AllocationDetails>
          <Row>
            <Label>Entry:</Label>
            <Value>₹{stock.entry}</Value>
          </Row>
          <Row>
            <Label>Stop:</Label>
            <Value>₹{stock.stop}</Value>
          </Row>
          <Row>
            <Label>Target:</Label>
            <Value>₹{stock.target}</Value>
          </Row>
          <Row>
            <Label>Quantity:</Label>
            <Value>{stock.quantity}</Value>
          </Row>
          <Row>
            <Label>Capital:</Label>
            <Value>₹{stock.capitalUsed}</Value>
          </Row>
          <Row>
            <Label>Max Loss:</Label>
            <Value className="red">₹{stock.maxLoss}</Value>
          </Row>
          <Row>
            <Label>Target Profit:</Label>
            <Value className="green">₹{stock.targetProfit}</Value>
          </Row>
        </AllocationDetails>
        
        <EditableParams>
          <Input label="Custom L%" value={stock.customL} />
          <Input label="Custom G%" value={stock.customG} />
          <Input label="Custom s%" value={stock.customS} />
          <Button>Recalculate</Button>
        </EditableParams>
      </StockCard>
    ))}
  </StockList>

  <BasketSummary>
    <Row>Total Capital: ₹{C}</Row>
    <Row>Capital Used: ₹{capitalUsed}</Row>
    <Row>Capital Remaining: ₹{C - capitalUsed}</Row>
    <Row>Max Basket Loss: ₹{basketLoss}</Row>
    <Row>Target Basket Profit: ₹{basketProfit}</Row>
    <Row>Risk-Reward: {basketProfit / basketLoss}</Row>
  </BasketSummary>

  <ActionButtons>
    <Button primary>Execute All Trades</Button>
    <Button secondary>Save Configuration</Button>
    <Button>Reset</Button>
  </ActionButtons>
</AITradingPanel>
```

---

## 🔧 IMPLEMENTATION CHECKLIST

### Phase 1: Core Algorithm
- [ ] Implement 100-point scoring system
- [ ] Implement exact capital allocation algorithm
- [ ] Validate all 7 steps of allocation
- [ ] Test with ₹1,000 and ₹1,00,000
- [ ] Ensure no over-allocation

### Phase 2: Data Integration
- [ ] Yahoo Finance OHLCV (1 month)
- [ ] Finnhub news (1 month)
- [ ] Cache mechanism
- [ ] Error handling
- [ ] Fallback logic

### Phase 3: UI Implementation
- [ ] Config section
- [ ] Stock cards (To-Do list style)
- [ ] Enable/Disable toggles
- [ ] Editable parameters
- [ ] Real-time recalculation
- [ ] Basket summary
- [ ] Clean, minimal design

### Phase 4: Paper Trading
- [ ] Execute trades
- [ ] Track entry/exit
- [ ] Calculate P&L
- [ ] Auto-close logic
- [ ] Trade log storage

### Phase 5: Performance Tracking
- [ ] Win rate calculation
- [ ] Expectancy calculation
- [ ] Weight updates
- [ ] Historical analysis

---

## 🚀 IMPLEMENTATION PRIORITY

1. **Critical (Do First)**:
   - Capital allocation algorithm
   - 100-point scoring
   - UI redesign

2. **Important (Do Next)**:
   - Data integration
   - Paper trading execution
   - Validation logic

3. **Nice to Have (Do Last)**:
   - Performance tracking
   - Weight updates
   - Historical analysis

---

## ⚠️ CRITICAL RULES

1. **NO SHORTCUTS** on capital allocation
2. **MAX 5 STOCKS** always
3. **NSE ONLY** (`.NS` suffix)
4. **NO DUMMY DATA** anywhere
5. **PROPORTIONAL ALLOCATION** (not equal)
6. **FLOOR QUANTITIES** (no fractional shares)
7. **VALIDATE BASKET** loss & profit
8. **AI SUGGESTS ONLY** (doesn't decide)

---

## 📊 EXAMPLE SCENARIOS

### Scenario 1: ₹1,00,000 Capital
```
Input:
  C = ₹1,00,000
  L% = 2%
  G% = 5%
  R = 2.5
  s% = 1%
  c% = 30%

AI Suggests:
  Stock A (w=0.35, score=92)
  Stock B (w=0.25, score=87)
  Stock C (w=0.20, score=82)
  Stock D (w=0.15, score=78)
  Stock E (w=0.05, score=71)

Expected Output:
  Stock A: Q=X, Entry=Y, Capital=~₹30,000
  Stock B: Q=X, Entry=Y, Capital=~₹21,000
  Stock C: Q=X, Entry=Y, Capital=~₹17,000
  Stock D: Q=X, Entry=Y, Capital=~₹13,000
  Stock E: Q=X, Entry=Y, Capital=~₹4,000
  
  Total Capital Used: ≤ ₹1,00,000
  Max Basket Loss: ≤ ₹2,000
  Target Basket Profit: ≥ ₹5,000
```

### Scenario 2: ₹1,000 Capital
```
Input:
  C = ₹1,000
  L% = 2%
  G% = 5%
  R = 2.5
  s% = 1%
  c% = 30%

Expected Output:
  Proportional allocation
  Total Capital Used: ≤ ₹1,000
  Max Basket Loss: ≤ ₹20
  Target Basket Profit: ≥ ₹50
```

---

## ✅ ACCEPTANCE CRITERIA

System is complete when:

1. ✅ I can input any capital amount
2. ✅ AI suggests max 5 NSE stocks
3. ✅ Allocation follows exact algorithm
4. ✅ UI is clean and usable
5. ✅ Paper trades execute correctly
6. ✅ No over-allocation occurs
7. ✅ Basket loss/profit validated
8. ✅ All data is live (no dummy)
9. ✅ Performance tracking works
10. ✅ System is testable for 1 month

---

**IMPLEMENT THIS EXACTLY. NO THEORY. NO EXPLANATIONS. JUST WORKING CODE.**
