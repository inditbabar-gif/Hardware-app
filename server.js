const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Category, Product, Order } = require('./models');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

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
    const notifications = pending.map(o => ({ text: `New Order: ${o.customerName}`, type: 'warning' }));
    res.json({ totalProducts: pCount, totalOrders: oCount, notifications });
});

app.get('/api/products', async (req, res) => res.json(await Product.find()));
app.post('/api/products', adminAuth, async (req, res) => res.json(await new Product(req.body).save()));
app.delete('/api/products/:id', adminAuth, async (req, res) => { await Product.findByIdAndDelete(req.params.id); res.json({success:true}); });
app.get('/api/categories', async (req, res) => res.json(await Category.find()));
app.post('/api/categories', adminAuth, async (req, res) => res.json(await new Category(req.body).save()));

app.get('/api/orders/all', adminAuth, async (req, res) => res.json(await Order.find().sort({createdAt:-1})));
app.post('/api/orders', async (req, res) => res.json(await new Order(req.body).save()));
app.put('/api/orders/:id/status', adminAuth, async (req, res) => { await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }); res.json({success:true}); });
app.get('/api/orders/:name', async (req, res) => res.json(await Order.find({customerName: req.params.name})));

// --- THE FIX: PRETTY HTML INVOICE ---
app.get('/api/invoice/:orderId', async (req, res) => {
    try {
        const o = await Order.findById(req.params.orderId);
        if (!o) return res.send("Order not found");

        const itemsHtml = o.items.map(i => `
            <tr>
                <td style="padding:10px; border-bottom:1px solid #eee;">${i.name}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${i.quantity}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">₹${i.price * i.quantity}</td>
            </tr>
        `).join('');

        const html = `
            <html>
            <head>
                <title>Bill - ${o.customerName}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: sans-serif; padding: 20px; color: #333; }
                    .bill-box { max-width: 500px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
                    .header { text-align: center; border-bottom: 2px solid #FF7B00; padding-bottom: 10px; margin-bottom: 20px; }
                    .total { font-size: 1.5rem; font-weight: bold; text-align: right; margin-top: 20px; color: #FF7B00; }
                    .status { text-align: center; margin-top: 30px; padding: 10px; border-radius: 5px; font-weight: bold; background: ${o.status === 'Paid' ? '#e6fffa' : '#fff5f5'}; color: ${o.status === 'Paid' ? '#00b894' : '#ff4757'}; }
                    @media print { .print-btn { display: none; } }
                </style>
            </head>
            <body>
                <div class="bill-box">
                    <div class="header">
                        <h1 style="margin:0;">Gulzar Hardware</h1>
                        <p style="margin:5px 0; color:gray;">Official Invoice</p>
                    </div>
                    <p><b>Order ID:</b> ${o._id}</p>
                    <p><b>Customer:</b> ${o.customerName}</p>
                    <p><b>Date:</b> ${new Date(o.createdAt).toLocaleDateString()}</p>
                    
                    <table style="width:100%; border-collapse: collapse; margin-top:20px;">
                        <thead>
                            <tr style="background:#f9f9f9;">
                                <th style="text-align:left; padding:10px;">Item</th>
                                <th style="padding:10px;">Qty</th>
                                <th style="text-align:right; padding:10px;">Price</th>
                            </tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>
                    
                    <div class="total">Total: ₹${o.totalAmount}</div>
                    <div class="status">${o.status === 'Paid' ? 'PAID IN FULL' : 'PAYMENT DUE AT STORE'}</div>
                    
                    <button class="print-btn" onclick="window.print()" style="width:100%; background:#FF7B00; color:white; border:none; padding:15px; border-radius:8px; font-weight:bold; margin-top:20px; cursor:pointer;">SAVE AS PDF / PRINT</button>
                </div>
            </body>
            </html>
        `;
        res.send(html);
    } catch (e) { res.status(500).send("Error generating bill"); }
});

app.get('/api/seed', async (req, res) => {
    await Category.deleteMany({}); await Product.deleteMany({});
    await Category.insertMany([{ name: 'Tools', icon: 'fa-wrench' }, { name: 'Plumbing', icon: 'fa-sink' }]);
    res.json({ message: "Seeded" });
});

startServer();
