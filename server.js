const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Category, Product, Order, Banner } = require('./models');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ⚠️ YOUR CONNECTION STRING
const mongoURI = 'mongodb+srv://gulzar:hardware123@cluster0.ecudqzb.mongodb.net/hardware?retryWrites=true&w=majority';

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("DB Connected"))
    .catch(err => console.log("DB Error", err));

const ADMIN_TOKEN = 'gulzar-secret-admin-token';

const adminAuth = (req, res, next) => {
    const auth = req.headers.authorization;
    if (auth === 'Bearer ' + ADMIN_TOKEN) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

app.post('/api/admin/login', (req, res) => {
    if(req.body.username === 'admin' && req.body.password === 'admin123') {
        res.json({ token: ADMIN_TOKEN });
    } else {
        res.status(401).json({ error: 'Invalid' });
    }
});

// GET DATA (Public)
app.get('/api/products', async (req, res) => { res.json(await Product.find()); });
app.get('/api/categories', async (req, res) => { res.json(await Category.find()); });
app.get('/api/banner', async (req, res) => { res.json(await Banner.findOne() || { imageUrl: '', text: '' }); });

// ADMIN STATS
app.get('/api/admin/stats', adminAuth, async (req, res) => {
    const pCount = await Product.countDocuments();
    const oCount = await Order.countDocuments();
    res.json({ totalProducts: pCount, totalOrders: oCount });
});

// BANNER
app.post('/api/banner', adminAuth, async (req, res) => {
    await Banner.deleteMany({});
    res.json(await new Banner(req.body).save());
});

// PRODUCT ADD/DELETE
app.post('/api/products', adminAuth, async (req, res) => {
    res.json(await new Product(req.body).save());
});

app.delete('/api/products/:id', adminAuth, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// CATEGORY ADD/DELETE
app.post('/api/categories', adminAuth, async (req, res) => {
    res.json(await new Category(req.body).save());
});

app.delete('/api/categories/:id', adminAuth, async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ORDERS
app.get('/api/orders/all', adminAuth, async (req, res) => {
    res.json(await Order.find().sort({ createdAt: -1 }));
});

app.put('/api/orders/:id/status', adminAuth, async (req, res) => {
    await Order.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ success: true });
});

app.post('/api/orders', async (req, res) => { res.json(await new Order(req.body).save()); });
app.get('/api/orders/:name', async (req, res) => { res.json(await Order.find({ customerName: req.params.name })); });

app.get('/api/invoice/:orderId', async (req, res) => {
    const o = await Order.findById(req.params.orderId);
    if(!o) return res.send("Order not found");
    const items = o.items.map(i => '<tr><td>'+i.name+'</td><td>'+i.quantity+'</td><td>₹'+(i.price * i.quantity)+'</td></tr>').join('');
    res.send('<html><body style="font-family:sans-serif;padding:20px;"><h2>Gulzar Hardware Receipt</h2><p>Customer: '+o.customerName+'</p><table border="1" width="100%" style="border-collapse:collapse;"><tr><th>Item</th><th>Qty</th><th>Total</th></tr>'+items+'</table><h3>Total: ₹'+o.totalAmount+'</h3><button onclick="window.print()">Print</button></body></html>');
});

app.listen(process.env.PORT || 3000);
