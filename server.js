const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Category, Product, Order } = require('./models');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ⚠️ PASTE YOUR ACTUAL MONGODB LINK BELOW
mongoose.connect('mongodb+srv://babarhere:Sujjat%40211@cluster0.ecudqzb.mongodb.net/?appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("Connected")).catch(err => console.log(err));

// ADMIN SECURITY
const adminAuth = (req, res, next) => {
    if(req.headers.authorization === 'Bearer gulzar-secret-admin-token') next();
    else res.status(401).json({ error: 'Unauthorized' });
};

app.post('/api/admin/login', (req, res) => {
    if(req.body.username === 'admin' && req.body.password === 'admin123') 
        res.json({ token: 'gulzar-secret-admin-token' });
    else res.status(401).json({ error: 'Invalid' });
});

// STATS
app.get('/api/admin/stats', adminAuth, async (req, res) => {
    const pCount = await Product.countDocuments();
    const oCount = await Order.countDocuments();
    const pending = await Order.find({ status: 'Pending' });
    const approved = await Order.find({ status: 'Approved' });
    const notifications = [
        ...pending.map(o => ({ text: `New Order: ${o.customerName}`, type: 'warning' })),
        ...approved.map(o => ({ text: `Unpaid: ${o.customerName}`, type: 'danger' }))
    ];
    res.json({ totalProducts: pCount, totalOrders: oCount, notifications });
});

// PRODUCTS
app.get('/api/products', async (req, res) => res.json(await Product.find()));
app.post('/api/products', adminAuth, async (req, res) => {
    const newP = new Product(req.body);
    await newP.save();
    res.json(newP);
});
app.delete('/api/products/:id', adminAuth, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// CATEGORIES
app.get('/api/categories', async (req, res) => res.json(await Category.find()));
app.post('/api/categories', adminAuth, async (req, res) => {
    const newC = new Category(req.body);
    await newC.save();
    res.json(newC);
});

// ORDERS
app.get('/api/orders/all', adminAuth, async (req, res) => res.json(await Order.find().sort({createdAt:-1})));
app.post('/api/orders', async (req, res) => res.json(await new Order(req.body).save()));
app.put('/api/orders/:id/status', adminAuth, async (req, res) => {
    await Order.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ success: true });
});
app.get('/api/orders/:name', async (req, res) => res.json(await Order.find({customerName: req.params.name})));

app.get('/api/invoice/:orderId', async (req, res) => {
    const o = await Order.findById(req.params.orderId);
    res.json({ storeName: "Gulzar Hardware", orderId: o._id, customerName: o.customerName, items: o.items, totalAmount: o.totalAmount, status: o.status, date: o.createdAt });
});

app.get('/api/seed', async (req, res) => {
    await Category.deleteMany({}); await Product.deleteMany({});
    await Category.insertMany([{ name: 'Tools', icon: 'fa-wrench' }, { name: 'Plumbing', icon: 'fa-sink' }]);
    res.json({ message: "Seeded" });
});

app.listen(process.env.PORT || 3000);
