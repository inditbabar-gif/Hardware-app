const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Category, Product, Order } = require('./models');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Serves your Frontend App
app.use(express.static(path.join(__dirname, 'public')));

// ⚠️ PASTE YOUR MONGODB LINK BELOW
mongoose.connect('mongodb+srv://babarhere:<db_password>@cluster0.ecudqzb.mongodb.net/?appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected")).catch(err => console.log(err));

// APIs
app.get('/api/categories', async (req, res) => res.json(await Category.find()));
app.get('/api/products', async (req, res) => res.json(await Product.find()));
app.post('/api/orders', async (req, res) => res.json(await new Order(req.body).save()));
app.get('/api/orders/:customerName', async (req, res) => res.json(await Order.find({ customerName: req.params.customerName }).sort({ createdAt: -1 })));
app.get('/api/invoice/:orderId', async (req, res) => {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status === 'Pending') return res.status(403).json({ error: "Waiting for admin approval." });
    res.json({ storeName: "Gulzar Hardware Store", orderId: order._id, customerName: order.customerName, items: order.items, totalAmount: order.totalAmount, status: order.status, date: order.createdAt });
});

// Seed Dummy Data
app.get('/api/seed', async (req, res) => {
    await Category.deleteMany({}); await Product.deleteMany({});
    await Category.insertMany([{ name: 'Tools', icon: 'fa-wrench' }, { name: 'Plumbing', icon: 'fa-sink' }]);
    await Product.insertMany([
        { name: 'Stanley Hammer', category: 'Tools', price: 450, image: 'https://via.placeholder.com/150/FF7B00/FFFFFF?text=Hammer' },
        { name: 'PVC Pipe', category: 'Plumbing', price: 120, image: 'https://via.placeholder.com/150/FF7B00/FFFFFF?text=PVC' }
    ]);
    res.json({ message: "Database Seeded!" });
});

app.listen(process.env.PORT || 3000, () => console.log("Server running"));
