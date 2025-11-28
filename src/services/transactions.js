import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const router = express.Router();
const pool = new Pool({
  user: 'postgres',
  password: 'your_password',
  host: 'localhost',
  database: 'trading_app',
  port: 5432,
});

// 🧾 Get all transactions for a user
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC',
      [userId]
    );
    res.json({ ok: true, transactions: result.rows });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch transactions' });
  }
});

// 💸 Add new transaction
router.post('/', async (req, res) => {
  const { user_id, type, symbol, quantity, price, amount, remarks } = req.body;
  try {
    const balRes = await pool.query(
      'SELECT balance FROM transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1',
      [user_id]
    );
    const prevBal = balRes.rows[0]?.balance || 0;
    const newBalance = prevBal + Number(amount);

    await pool.query(
      `INSERT INTO transactions 
       (user_id, type, symbol, quantity, price, amount, balance, remarks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [user_id, type, symbol, quantity, price, amount, newBalance, remarks]
    );

    res.json({ ok: true, balance: newBalance });
  } catch (err) {
    console.error('Add transaction error:', err);
    res.status(500).json({ ok: false, error: 'Failed to add transaction' });
  }
});

export default router;
