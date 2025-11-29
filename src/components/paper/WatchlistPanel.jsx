const s = input.trim().toUpperCase();
if (!s) return;
fetch(`${MARKET_API_URL}/quote/${encodeURIComponent(s)}`).then(r => r.json()).then(j => {
  if (!j.price) return alert('Symbol not found');
  const st = JSON.parse(localStorage.getItem('advantix_paper_v3') || '{}');
  st.watchlist = st.watchlist || [];
  if (!st.watchlist.includes(s)) st.watchlist.push(s);
  localStorage.setItem('advantix_paper_v3', JSON.stringify(st));
  setInput('');
  refresh();
}).catch(() => alert('Symbol lookup failed'));
  }
return (
  <div>
    <div className="text-teal-300 font-semibold mb-2">Watchlist</div>
    <div className="flex gap-2 mb-3">
      <input className="flex-1 bg-[#0b1220] p-2 rounded border border-slate-700" placeholder="Add symbol (RELIANCE.NS or AAPL)" value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={add} className="px-4 py-2 rounded bg-cyan-600">Add</button>
    </div>
    <div className="space-y-2">
      {watchlist.map(sym => {
        const q = quotes[sym] || {};
        const change = q.change || 0;
        const up = change >= 0;
        return (
          <div key={sym} className="flex justify-between items-center bg-[#0f1724] p-3 rounded border border-slate-800">
            <div onClick={() => onSelect(sym)} className="cursor-pointer">
              <div className="font-medium">{sym}</div>
              <div className="text-sm text-slate-400">LTP: {q.price ? `₹${q.price.toFixed(2)}` : '—'}</div>
            </div>
            <div className={up ? 'text-green-400' : 'text-rose-400'}>{(change ? (change * 100).toFixed(2) + '%' : '—')}</div>
          </div>
        );
      })}
    </div>
  </div>
);
}
