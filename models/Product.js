const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a product name'],
        maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    description: {
        type: String,
        required: [true, 'Please provide a description'],
    },
    price: {
        type: String,
        required: [true, 'Please provide a price'],
    },
    image: {
        type: String,
        required: [true, 'Please provide an image'],
    },
    categories: {
        type: [String],
        required: [true, 'Please provide at least one category'],
    },
    brand: {
        type: String,
        default: '',
    },
    currentInventory: {
        type: Number,
        required: [true, 'Please provide inventory count'],
        min: [0, 'Inventory cannot be negative'],
    },
    sku: {
        type: String,
        unique: true,
        sparse: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
