class TransactionService {
  static API_BASE = (import.meta.env.VITE_MARKET_API_URL || 'https://algotrading-2sbm.onrender.com/api') + '/transactions';

  static async getAll(userId) {
    const res = await fetch(`${this.API_BASE}/${userId}`);
    const data = await res.json();
    if (!data.ok) throw new Error('Failed to fetch transactions');
    return data.transactions;
  }

  static async add(txn) {
    const res = await fetch(this.API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txn),
    });
    const data = await res.json();
    if (!data.ok) throw new Error('Failed to add transaction');
    return data;
  }
}

export default TransactionService;
