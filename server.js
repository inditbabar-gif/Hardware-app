const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Category, Product, Order } = require('./models');

const app = express();
app.use(express.json());
app.use(cors());

// Serves the frontend
app.use(express.static(path.join(__dirname, 'public')));

// ⚠️ PASTE YOUR ACTUAL MONGODB LINK BELOW
mongoose.connect('mongodb+srv://babarhere:Sujjat%40211@cluster0.ecudqzb.mongodb.net/?appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected")).catch(err => console.log(err));

// ==========================================
// ADMIN SECURITY (Simulated JWT Token)
// ==========================================
const adminAuth = (req, res, next) => {
    if(req.headers.authorization === 'Bearer gulzar-secret-admin-token') next();
    else res.status(401).json({ error: 'Unauthorized Access' });
};

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    // Hardcoded Admin Credentials for Mobile Ease
    if(username === 'admin' && password === 'admin123') {
        res.json({ token: 'gulzar-secret-admin-token' });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// ==========================================
// ADMIN DASHBOARD & NOTIFICATIONS
// ==========================================
app.get('/api/admin/stats', adminAuth, async (req, res) => {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const pendingPayments = await Order.countDocuments({ status: 'Approved' });
    const pendingOrders = await Order.find({ status: 'Pending' });
    
    // Notifications system (New Orders & Unpaid Bills)
    const notifications =[
        ...pendingOrders.map(o => ({ text: `New order needs approval: ${o.customerName}`, type: 'warning' })),
        ...(await Order.find({ status: 'Approved' })).map(o => ({ text: `Payment pending: ₹${o.totalAmount} from ${o.customerName}`, type: 'danger' }))
    ];
    res.json({ totalProducts, totalOrders, pendingPayments, notifications });
});

// ==========================================
// CRUD APIS (PRODUCTS & CATEGORIES)
// ==========================================
app.get('/api/products', async (req, res) => res.json(await Product.find()));
app.post('/api/products', adminAuth, async (req, res) => res.json(await new Product(req.body).save()));
app.put('/api/products/:id', adminAuth, async (req, res) => res.json(await Product.findByIdAndUpdate(req.params.id, req.body, {new: true})));
app.delete('/api/products/:id', adminAuth, async (req, res) => { await Product.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.get('/api/categories', async (req, res) => res.json(await Category.find()));
app.post('/api/categories', adminAuth, async (req, res) => res.json(await new Category(req.body).save()));
app.delete('/api/categories/:id', adminAuth, async (req, res) => { await Category.findByIdAndDelete(req.params.id); res.json({ success: true }); });

// ==========================================
// ORDERS & PAYMENT APIs
// ==========================================
app.get('/api/orders/all', adminAuth, async (req, res) => res.json(await Order.find().sort({ createdAt: -1 })));
app.get('/api/orders/:customerName', async (req, res) => res.json(await Order.find({ customerName: req.params.customerName }).sort({ createdAt: -1 })));
app.post('/api/orders', async (req, res) => res.json(await new Order(req.body).save()));
app.put('/api/orders/:id/status', adminAuth, async (req, res) => res.json(await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, {new: true})));

app.get('/api/invoice/:orderId', async (req, res) => {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status === 'Pending') return res.status(403).json({ error: "Waiting for admin approval." });
    res.json({ storeName: "Gulzar Hardware Store", orderId: order._id, customerName: order.customerName, items: order.items, totalAmount: order.totalAmount, status: order.status, date: order.createdAt });
});

app.listen(process.env.PORT || 3000, () => console.log("Server running"));
