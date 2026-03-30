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

async function startServer() {
    try {
        await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("✅ DB Connected");
        app.listen(process.env.PORT || 3000, () => console.log("🚀 Server Live"));
    } catch (err) { console.error(err); app.listen(process.env.PORT || 3000); }
}

const adminAuth = (req, res, next) => {
    if(req.headers.authorization === 'Bearer gulzar-secret-admin-token') next();
    else res.status(401).json({ error: 'Unauthorized' });
};

// ADMIN LOGIN
app.post('/api/admin/login', (req, res) => {
    if(req.body.username === 'admin' && req.body.password === 'admin123') res.json({ token: 'gulzar-secret-admin-token' });
    else res.status(401).json({ error: 'Invalid' });
});

// STATS
app.get('/api/admin/stats', adminAuth, async (req, res) => {
    const pCount = await Product.countDocuments();
    const oCount = await Order.countDocuments();
    const pending = await Order.find({ status: 'Pending' });
    res.json({ totalProducts: pCount, totalOrders: oCount, notifications: pending.map(o => ({ text: `New Order: ${o.customerName}`, type: 'warning' })) });
});

// BANNER
app.get('/api/banner', async (req, res) => { res.json(await Banner.findOne() || {imageUrl:'', text:''}); });
app.post('/api/banner', adminAuth, async (req, res) => {
    await Banner.deleteMany({});
    res.json(await new Banner(req.body).save());
});

// PRODUCTS & CATEGORIES (With Fixed Delete)
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

// ORDERS
app.get('/api/orders/all', adminAuth, async (req, res) => res.json(await Order.find().sort({createdAt:-1})));
app.post('/api/orders', async (req, res) => res.json(await new Order(req.body).save()));
app.put('/api/orders/:id/status', adminAuth, async (req, res) => {
    await Order.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ success: true });
});
app.get('/api/orders/:name', async (req, res) => res.json(await Order.find({customerName: req.params.name})));

// --- THE FIX: PRETTY HTML BILL ---
app.get('/api/invoice/:orderId', async (req, res) => {
    try {
        const o = await Order.findById(req.params.orderId);
        if (!o) return res.send("Order not found");

        const itemsHtml = o.items.map(i => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; text-align: left;">${i.name}</td>
                <td style="padding: 10px; text-align: center;">${i.quantity}</td>
                <td style="padding: 10px; text-align: right;">₹${i.price * i.quantity}</td>
            </tr>
        `).join('');

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: sans-serif; background: #f5f5f5; padding: 10px; margin: 0; }
                .bill-box { background: #fff; max-width: 450px; margin: auto; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                .header { text-align: center; border-bottom: 2px solid #FF7B00; padding-bottom: 10px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th { background: #f9f9f9; padding: 10px; font-size: 0.8rem; }
                .total { text-align: right; font-size: 1.4rem; font-weight: bold; margin-top: 20px; color: #FF7B00; }
                .status { text-align: center; margin-top: 20px; font-weight: bold; color: ${o.status === 'Paid' ? 'green' : 'red'}; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="bill-box">
                <div class="header">
                    <h1 style="margin:0; font-size:1.5rem;">GULZAR HARDWARE</h1>
                    <p style="margin:5px 0; color:gray;">Official Receipt</p>
                </div>
                <p style="font-size:0.8rem;"><b>Order ID:</b> ${o._id}</p>
                <p style="font-size:0.9rem;"><b>Customer:</b> ${o.customerName}</p>
                <p style="font-size:0.9rem;"><b>Date:</b> ${new Date(o.createdAt).toLocaleDateString()}</p>
                
                <table>
                    <thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                
                <div class="total">Total: ₹${o.totalAmount}</div>
                <div class="status">${o.status === 'Paid' ? 'PAID SUCCESSFULLY' : 'PAYMENT DUE AT STORE'}</div>
                
                <button class="no-print" onclick="window.print()" style="width:100%; background:#333; color:white; border:none; padding:12px; border-radius:8px; margin-top:20px; font-weight:bold;">SAVE PDF / PRINT</button>
            </div>
        </body>
        </html>`;
        res.send(html);
    } catch (e) { res.status(500).send("Error generating bill"); }
});

startServer();
