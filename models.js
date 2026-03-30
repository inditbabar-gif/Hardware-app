const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({ name: String, icon: String });
const ProductSchema = new mongoose.Schema({ name: String, category: String, price: Number, image: String, description: String, stock: { type: Number, default: 50 } }); // Added Stock
const BannerSchema = new mongoose.Schema({ imageUrl: String, text: String, active: { type: Boolean, default: true } }); // New Banner Model
const OrderSchema = new mongoose.Schema({
    customerName: String,
    items: Array,
    totalAmount: Number,
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = {
    Category: mongoose.model('Category', CategorySchema),
    Product: mongoose.model('Product', ProductSchema),
    Banner: mongoose.model('Banner', BannerSchema),
    Order: mongoose.model('Order', OrderSchema)
};
