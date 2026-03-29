const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({ name: String, icon: String });
const ProductSchema = new mongoose.Schema({ name: String, category: String, price: Number, image: String, description: String });
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
    Order: mongoose.model('Order', OrderSchema)
};
