const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Category, Product, Order } = require('./models');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ⚠️ YOUR CONNECTION STRING
const mongoURI = 'mongodb+srv://gulzar:hardware123@cluster0.ecudqzb.mongodb.net/hardware?retryWrites=true&w=majority';

async function startServer() {
    try {
        await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("✅ DB Connected");
        app.listen(process.env.PORT || 3000, () => console.log("🚀 Server Live"));
    } catch (err) {
        console.error(err);
        app.listen(process.env.PORT || 3000);
    }
}

const adminAuth = (req, res, next) => {
    if(req.headers.authorization === 'Bearer gulzar-secret-admin-token') next();
    else res.status(401).json({ error: 'Unauthorized' });
};

app.post('/api/admin/login', (req, res) => {
    if(req.body.username === 'admin' && req.body.password === 'admin123') 
        res.json({ token: 'gulzar-secret-admin-token' });
    else res.status(401).json({ error: 'Invalid' });
});

app.get('/api/admin/stats', adminAuth, async (req, res) => {
    const pCount = await Product.countDocuments();
    const oCount = await Order.countDocuments();
    const pending = await Order.find({ status: 'Pending' });
    res.json({ totalProducts: pCount, totalOrders: oCount, 
               notifications: pending.map(o => ({ text: `New Order: ${o.customerName}`, type: 'warning' })) 
    });
});

app.get('/api/products', async (req, res) => res.json(await Product.find()));
app.post('/api/products', adminAuth, async (req, res) => res.json(await new Product(req.body).save()));
app.delete('/api/products/:id', adminAuth, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.get('/api/categories', async (req, res) => res.json(await Category.find()));
app.post('/api/categories', adminAuth, async (req, res) => res.json(await new Category(req.body).save()));
app.delete('/api/categories/:id', adminAuth, async (req, res) => {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.get('/api/orders/all', adminAuth, async (req, res) => res.json(await Order.find().sort({createdAt:-1})));
app.post('/api/orders', async (req, res) => res.json(await new Order(req.body).save()));
app.put('/api/orders/:id/status', adminAuth, async (req, res) => { 
    await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }); 
    res.json({ success: true }); 
});
app.get('/api/orders/:name', async (req, res) => res.json(await Order.find({customerName: req.params.name})));

app.get('/api/invoice/:orderId', async (req, res) => {
    const o = await Order.findById(req.params.orderId);
    if (!o) return res.send("Order not found");
    res.json({ storeName: "Gulzar Hardware", orderId: o._id, customerName: o.customerName, items: o.items, totalAmount: o.totalAmount, status: o.status, date: o.createdAt });
});

app.get('/api/seed', async (req, res) => {
    await Category.deleteMany({}); await Product.deleteMany({});
    await Category.insertMany([{ name: 'Tools', icon: 'fa-wrench' }, { name: 'Plumbing', icon: 'fa-sink' }]);
    res.json({ message: "Seeded" });
});

startServer();
