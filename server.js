const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Category, Product, Order } = require('./models');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ⚠️ YOUR CONNECTION STRING (Using %40 for @ in password)
const mongoURI = 'mongodb+srv://gulzar:hardware123@cluster0.ecudqzb.mongodb.net/hardware?retryWrites=true&w=majority';

// DATABASE CONNECTION
async function startServer() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoURI, { 
            useNewUrlParser: true, 
            useUnifiedTopology: true 
        });
        console.log("✅ Database Connected Successfully!");

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 Server live on port ${PORT}`);
        });

    } catch (err) {
        console.error("❌ Database Connection Failed:", err.message);
        app.listen(process.env.PORT || 3000);
    }
}

// --- ADMIN SECURITY ---
const adminAuth = (req, res, next) => {
    if(req.headers.authorization === 'Bearer gulzar-secret-admin-token') next();
    else res.status(401).json({ error: 'Unauthorized' });
};

app.post('/api/admin/login', (req, res) => {
    if(req.body.username === 'admin' && req.body.password === 'admin123') 
        res.json({ token: 'gulzar-secret-admin-token' });
    else res.status(401).json({ error: 'Invalid Credentials' });
});

// --- DASHBOARD STATS ---
app.get('/api/admin/stats', adminAuth, async (req, res) => {
    try {
        const pCount = await Product.countDocuments();
        const oCount = await Order.countDocuments();
        const pending = await Order.find({ status: 'Pending' });
        const approved = await Order.find({ status: 'Approved' });
        const notifications = [
            ...pending.map(o => ({ text: `New Order: ${o.customerName}`, type: 'warning' })),
            ...approved.map(o => ({ text: `Unpaid: ${o.customerName}`, type: 'danger' }))
        ];
        res.json({ totalProducts: pCount, totalOrders: oCount, notifications });
    } catch(e) { res.status(500).json({error: e.message}); }
});

// --- PRODUCTS API ---
app.get('/api/products', async (req, res) => {
    try { res.json(await Product.find()); } catch(e) { res.status(500).send(e.message); }
});

app.post('/api/products', adminAuth, async (req, res) => {
    try {
        const newP = new Product(req.body);
        await newP.save();
        res.json(newP);
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.delete('/api/products/:id', adminAuth, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).send(e.message); }
});

// --- CATEGORIES API ---
app.get('/api/categories', async (req, res) => {
    try { res.json(await Category.find()); } catch(e) { res.status(500).send(e.message); }
});

app.post('/api/categories', adminAuth, async (req, res) => {
    try {
        const newC = new Category(req.body);
        await newC.save();
        res.json(newC);
    } catch(e) { res.status(500).send(e.message); }
});

// --- ORDERS API ---
app.get('/api/orders/all', adminAuth, async (req, res) => {
    try { res.json(await Order.find().sort({createdAt:-1})); } catch(e) { res.status(500).send(e.message); }
});

app.post('/api/orders', async (req, res) => {
    try { res.json(await new Order(req.body).save()); } catch(e) { res.status(500).send(e.message); }
});

app.put('/api/orders/:id/status', adminAuth, async (req, res) => {
    try {
        await Order.findByIdAndUpdate(req.params.id, { status: req.body.status });
        res.json({ success: true });
    } catch(e) { res.status(500).send(e.message); }
});

app.get('/api/orders/:name', async (req, res) => {
    try { res.json(await Order.find({customerName: req.params.name})); } catch(e) { res.status(500).send(e.message); }
});

// --- INVOICE / BILL API ---
app.get('/api/invoice/:orderId', async (req, res) => {
    try {
        const o = await Order.findById(req.params.orderId);
        if (!o) return res.status(404).json({ error: "Order not found" });
        
        res.json({ 
            storeName: "Gulzar Hardware Store", 
            orderId: o._id, 
            customerName: o.customerName, 
            items: o.items, 
            totalAmount: o.totalAmount, 
            status: o.status, 
            date: o.createdAt 
        });
    } catch (e) {
        res.status(500).json({ error: "Error loading bill" });
    }
});

// --- SEEDER ---
app.get('/api/seed', async (req, res) => {
    try {
        await Category.deleteMany({}); 
        await Product.deleteMany({});
        const cats = await Category.insertMany([
            { name: 'Tools', icon: 'fa-wrench' }, 
            { name: 'Plumbing', icon: 'fa-sink' },
            { name: 'Electrical', icon: 'fa-bolt' },
            { name: 'Paint', icon: 'fa-paint-roller' }
        ]);
        res.json({ message: "Seeded Successfully", cats });
    } catch(e) { res.status(500).send("Seed Error: " + e.message); }
});

startServer();
