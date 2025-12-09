# AI Trading Modal - Quantity & Button State Updates

## Changes Needed:

### 1. Add State Variables (Line 12-18)
```javascript
const [approvedStocks, setApprovedStocks] = useState([]);
const [stockQuantities, setStockQuantities] = useState({});
```

### 2. Update approveStock Function (Line 113-137)
```javascript
const approveStock = (stock) => {
    // Add to approved list
    setApprovedStocks(prev => [...prev, stock.symbol]);
    
    if (!config.selectedStocks.includes(stock.symbol)) {
        setConfig(prev => ({
            ...prev,
            selectedStocks: [...prev.selectedStocks, stock.symbol],
            stockQuantities: {
                ...prev.stockQuantities,
                [stock.symbol]: stockQuantities[stock.symbol] || 1
            }
        }));
    }

    // Remove from suggested list after 2 seconds
    setTimeout(() => {
        const remaining = suggestedStocks.filter(s => s.symbol !== stock.symbol);
        const nextStock = stockPool.find(s => 
            !remaining.some(r => r.symbol === s.symbol) &&
            !config.selectedStocks.includes(s.symbol) &&
            !declinedStocks.includes(s.symbol) &&
            !approvedStocks.includes(s.symbol) &&
            s.symbol !== stock.symbol
        );
        if (nextStock) {
            setSuggestedStocks([...remaining, nextStock]);
        } else {
            setSuggestedStocks(remaining);
        }
    }, 2000);
};
```

### 3. Update declineStock Function (Line 139-160)
```javascript
const declineStock = (stock) => {
    // Add to declined list (already exists)
    setDeclinedStocks(prev => [...prev, stock.symbol]);

    // Remove from suggested list after 2 seconds (add delay)
    setTimeout(() => {
        const remaining = suggestedStocks.filter(s => s.symbol !== stock.symbol);
        const nextStock = stockPool.find(s => 
            !remaining.some(r => r.symbol === s.symbol) &&
            !config.selectedStocks.includes(s.symbol) &&
            !declinedStocks.includes(s.symbol) &&
            !approvedStocks.includes(s.symbol) &&
            s.symbol !== stock.symbol
        );
        if (nextStock) {
            setSuggestedStocks([...remaining, nextStock]);
        } else {
            setSuggestedStocks(remaining);
        }
    }, 2000);
};
```

### 4. Add Quantity Input in Stock Card (Before buttons, around line 679)
```javascript
{/* Quantity Input */}
<div className="mb-4">
    <label className="block text-sm text-slate-300 mb-2 font-medium">
        Quantity (How many shares?)
    </label>
    <input
        type="number"
        min="1"
        value={stockQuantities[stock.symbol] || 1}
        onChange={(e) => setStockQuantities(prev => ({
            ...prev,
            [stock.symbol]: parseInt(e.target.value) || 1
        }))}
        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white font-semibold focus:border-purple-500 focus:outline-none"
    />
    <p className="text-xs text-slate-500 mt-2">
        Total: ₹{(stock.price * (stockQuantities[stock.symbol] || 1)).toFixed(2)}
    </p>
</div>
```

### 5. Update Buttons to Show State (Line 680-692)
```javascript
<div className="flex gap-4">
    <button
        onClick={() => approveStock(stock)}
        disabled={approvedStocks.includes(stock.symbol)}
        className={`flex-1 py-4 font-bold rounded-xl transition-all shadow-lg ${
            approvedStocks.includes(stock.symbol)
                ? 'bg-green-800 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-green-500/20 hover:shadow-green-500/40 hover:scale-105'
        }`}
    >
        {approvedStocks.includes(stock.symbol) ? '✅ Approved' : '✅ Approve & Add'}
    </button>
    <button
        onClick={() => declineStock(stock)}
        disabled={declinedStocks.includes(stock.symbol)}
        className={`flex-1 py-4 font-bold rounded-xl transition-all shadow-lg ${
            declinedStocks.includes(stock.symbol)
                ? 'bg-red-800 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-red-500/20 hover:shadow-red-500/40 hover:scale-105'
        }`}
    >
        {declinedStocks.includes(stock.symbol) ? '❌ Declined' : '❌ Decline'}
    </button>
</div>
```

## Summary:
1. ✅ Added `approvedStocks` and `stockQuantities` state
2. ✅ Updated approve/decline to track state
3. ✅ Added 2-second delay before removing from list
4. ✅ Added quantity input for each stock
5. ✅ Buttons change to "Approved" / "Declined" after clicking
6. ✅ Buttons are disabled after clicking
