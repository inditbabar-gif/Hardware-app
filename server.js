const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Category, Product, Order } = require('./models');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ⚠️ PASTE YOUR MONGODB LINK BELOW
const mongoURI = 'mongodb+srv://babarhere:Sujjat%40211@cluster0.ecudqzb.mongodb.net/hardware?appName=Cluster0';

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch(err => console.log("Database Connection Error: ", err));

// ADMIN AUTH
const adminAuth = (req, res, next) => {
    if(req.headers.authorization === 'Bearer gulzar-secret-admin-token') next();
    else res.status(401).json({ error: 'Unauthorized' });
};

app.post('/api/admin/login', (req, res) => {
    if(req.body.username === 'admin' && req.body.password === 'admin123') 
        res.json({ token: 'gulzar-secret-admin-token' });
    else res.status(401).json({ error: 'Invalid' });
});

// DASHBOARD STATS
app.get('/api/admin/stats', adminAuth, async (req, res) => {
    try {
        const pCount = await Product.countDocuments();
        const oCount = await Order.countDocuments();
        const pending = await Order.find({ status: 'Pending' });
        const notifications = pending.map(o => ({ text: `New Order: ${o.customerName}`, type: 'warning' }));
        res.json({ totalProducts: pCount, totalOrders: oCount, notifications });
    } catch(e) { res.status(500).json({error: e.message}); }
});

// PRODUCTS
app.get('/api/products', async (req, res) => {
    try { res.json(await Product.find()); } catch(e) { res.status(500).send(e); }
});

app.post('/api/products', adminAuth, async (req, res) => {
    try {
        const newP = new Product(req.body);
        await newP.save();
        res.json(newP);
    } catch(e) { res.status(500).json({error: "Failed to save product"}); }
});

app.delete('/api/products/:id', adminAuth, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).send(e); }
});

// CATEGORIES
app.get('/api/categories', async (req, res) => {
    try { res.json(await Category.find()); } catch(e) { res.status(500).send(e); }
});

app.post('/api/categories', adminAuth, async (req, res) => {
    try {
        const newC = new Category(req.body);
        await newC.save();
        res.json(newC);
    } catch(e) { res.status(500).send(e); }
});

// ORDERS
app.get('/api/orders/all', adminAuth, async (req, res) => {
    try { res.json(await Order.find().sort({createdAt:-1})); } catch(e) { res.status(500).send(e); }
});

app.post('/api/orders', async (req, res) => {
    try { res.json(await new Order(req.body).save()); } catch(e) { res.status(500).send(e); }
});

app.put('/api/orders/:id/status', adminAuth, async (req, res) => {
    try {
        await Order.findByIdAndUpdate(req.params.id, { status: req.body.status });
        res.json({ success: true });
    } catch(e) { res.status(500).send(e); }
});

app.get('/api/orders/:name', async (req, res) => {
    try { res.json(await Order.find({customerName: req.params.name})); } catch(e) { res.status(500).send(e); }
});

// SEEDER
app.get('/api/seed', async (req, res) => {
    try {
        await Category.deleteMany({}); 
        await Product.deleteMany({});
        const cats = await Category.insertMany([{ name: 'Tools', icon: 'fa-wrench' }, { name: 'Plumbing', icon: 'fa-sink' }]);
        res.json({ message: "Seeded Successfully", cats });
    } catch(e) { res.status(500).send(e.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
