const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Category, Product, Order, Banner } = require('./models');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const mongoURI = 'mongodb+srv://gulzar:hardware123@cluster0.ecudqzb.mongodb.net/hardware?retryWrites=true&w=majority';

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected"))
    .catch(err => console.log(err));

// ADMIN AUTHENTICATION GATE
const adminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader === 'Bearer gulzar-secret-admin-token') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if(username === 'admin' && password === 'admin123') {
        res.json({ token: 'gulzar-secret-admin-token' });
    } else {
        res.status(401).json({ error: 'Invalid' });
    }
});

// GET DATA (Public)
app.get('/api/products', async (req, res) => {
    const data = await Product.find();
    res.json(data);
});

app.get('/api/categories', async (req, res) => {
    const data = await Category.find();
    res.json(data);
});

app.get('/api/banner', async (req, res) => {
    const data = await Banner.findOne();
    res.json(data || { imageUrl: '', text: '' });
});

// ADMIN ACTIONS (Private - Needs Token)
app.get('/api/admin/stats', adminAuth, async (req, res) => {
    const pCount = await Product.countDocuments();
    const oCount = await Order.countDocuments();
    const pending = await Order.find({ status: 'Pending' });
    res.json({ 
        totalProducts: pCount, 
        totalOrders: oCount, 
        notifications: pending.map(o => ({ text: `New Order: ${o.customerName}`, type: 'warning' })) 
    });
});

app.post('/api/banner', adminAuth, async (req, res) => {
    await Banner.deleteMany({});
    const b = new Banner(req.body);
    await b.save();
    res.json(b);
});

app.post('/api/products', adminAuth, async (req, res) => {
    const p = new Product(req.body);
    await p.save();
    res.json(p);
});

app.delete('/api/products/:id', adminAuth, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.post('/api/categories', adminAuth, async (req, res) => {
    const c = new Category(req.body);
    await c.save();
    res.json(c);
});

app.delete('/api/categories/:id', adminAuth, async (req, res) => {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.get('/api/orders/all', adminAuth, async (req, res) => {
    const data = await Order.find().sort({ createdAt: -1 });
    res.json(data);
});

app.put('/api/orders/:id/status', adminAuth, async (req, res) => {
    await Order.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ success: true });
});

// USER ORDERING
app.post('/api/orders', async (req, res) => {
    const o = new Order(req.body);
    await o.save();
    res.json(o);
});

app.get('/api/orders/:name', async (req, res) => {
    const data = await Order.find({ customerName: req.params.name });
    res.json(data);
});

// PRETTY INVOICE HTML
app.get('/api/invoice/:orderId', async (req, res) => {
    const o = await Order.findById(req.params.orderId);
    if(!o) return res.send("Order not found");
    const items = o.items.map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>₹${i.price * i.quantity}</td></tr>`).join('');
    res.send(`<html><body style="font-family:sans-serif;padding:20px;"><h2>Gulzar Hardware Receipt</h2><p>Customer: ${o.customerName}</p><table border="1" width="100%" style="border-collapse:collapse;"><tr><th>Item</th><th>Qty</th><th>Total</th></tr>${items}</table><h3>Grand Total: ₹${o.totalAmount}</h3><button onclick="window.print()">Print Receipt</button></body></html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
