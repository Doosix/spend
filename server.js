
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Support large base64 images

// Database Configuration
// In production, these should come from Environment Variables
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'u148190840_spend',
    password: process.env.DB_PASSWORD || 'G=rrdj^nc7',
    database: process.env.DB_NAME || 'u148190840_spend',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
};

// Database Connection Helper
async function getDB() {
    return await mysql.createConnection(dbConfig);
}

// --- TRANSACTIONS ROUTES ---

app.get('/api/transactions', async (req, res) => {
    try {
        const db = await getDB();
        const [rows] = await db.execute('SELECT * FROM transactions ORDER BY date DESC');
        
        // Convert TinyInt (boolean) back to boolean
        const formatted = rows.map(r => ({
            ...r,
            isRecurring: !!r.isRecurring,
            amount: parseFloat(r.amount)
        }));
        
        await db.end();
        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/transactions', async (req, res) => {
    try {
        const db = await getDB();
        const t = req.body;
        const sql = `INSERT INTO transactions 
        (id, type, amount, description, category, date, createdAt, notes, attachment, isRecurring, goalId, billId) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        await db.execute(sql, [
            t.id, t.type, t.amount, t.description, t.category, t.date, t.createdAt, 
            t.notes || null, t.attachment || null, t.isRecurring, t.goalId || null, t.billId || null
        ]);
        
        await db.end();
        res.json(t);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/transactions/:id', async (req, res) => {
    try {
        const db = await getDB();
        const t = req.body;
        const sql = `UPDATE transactions SET 
        type=?, amount=?, description=?, category=?, date=?, notes=?, attachment=?, isRecurring=?, goalId=?, billId=?
        WHERE id=?`;
        
        await db.execute(sql, [
            t.type, t.amount, t.description, t.category, t.date, 
            t.notes || null, t.attachment || null, t.isRecurring, t.goalId || null, t.billId || null,
            req.params.id
        ]);
        
        await db.end();
        res.json(t);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/transactions/:id', async (req, res) => {
    try {
        const db = await getDB();
        await db.execute('DELETE FROM transactions WHERE id = ?', [req.params.id]);
        await db.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- GOALS ROUTES (Sync Strategy) ---

app.get('/api/goals', async (req, res) => {
    try {
        const db = await getDB();
        const [rows] = await db.execute('SELECT * FROM goals');
        await db.end();
        res.json(rows.map(r => ({ ...r, targetAmount: parseFloat(r.targetAmount), currentAmount: parseFloat(r.currentAmount) })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/goals/sync', async (req, res) => {
    try {
        const db = await getDB();
        await db.beginTransaction();
        
        // Wipe and Replace for simple sync
        await db.execute('DELETE FROM goals');
        
        const goals = req.body;
        if (goals.length > 0) {
            const sql = 'INSERT INTO goals (id, name, targetAmount, currentAmount, deadline, color, icon) VALUES ?';
            const values = goals.map(g => [g.id, g.name, g.targetAmount, g.currentAmount, g.deadline || null, g.color, g.icon]);
            await db.query(sql, [values]);
        }
        
        await db.commit();
        await db.end();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- BILLS ROUTES (Sync Strategy) ---

app.get('/api/bills', async (req, res) => {
    try {
        const db = await getDB();
        const [rows] = await db.execute('SELECT * FROM bills');
        const formatted = rows.map(r => ({
            ...r,
            amount: parseFloat(r.amount),
            autoPay: !!r.autoPay,
            isSubscription: !!r.isSubscription
        }));
        await db.end();
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bills/sync', async (req, res) => {
    try {
        const db = await getDB();
        await db.beginTransaction();
        await db.execute('DELETE FROM bills');
        
        const bills = req.body;
        if (bills.length > 0) {
            const sql = 'INSERT INTO bills (id, name, amount, category, dueDateDay, autoPay, lastPaidDate, isSubscription) VALUES ?';
            const values = bills.map(b => [b.id, b.name, b.amount, b.category, b.dueDateDay, b.autoPay, b.lastPaidDate || null, b.isSubscription]);
            await db.query(sql, [values]);
        }
        
        await db.commit();
        await db.end();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- BUDGETS ROUTES (Sync Strategy) ---

app.get('/api/budgets', async (req, res) => {
    try {
        const db = await getDB();
        const [rows] = await db.execute('SELECT * FROM budgets');
        await db.end();
        res.json(rows.map(r => ({...r, limit: parseFloat(r.limit)}))); // limit is a keyword in sql, but handled by mysql2 usually
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/budgets/sync', async (req, res) => {
    try {
        const db = await getDB();
        await db.beginTransaction();
        await db.execute('DELETE FROM budgets');
        
        const budgets = req.body;
        if (budgets.length > 0) {
            // Escape `limit` column name
            const sql = 'INSERT INTO budgets (category, `limit`, period) VALUES ?';
            const values = budgets.map(b => [b.category, b.limit, b.period]);
            await db.query(sql, [values]);
        }
        
        await db.commit();
        await db.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
