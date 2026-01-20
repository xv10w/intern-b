const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        name: String,
        price: String,
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        image: String,
    }],
    totalAmount: {
        type: Number,
        required: true,
    },
    shippingAddress: {
        name: String,
        email: String,
        address: String,
    },
    paymentMethod: {
        type: String,
        enum: ['UPI', 'COD'],
        default: 'UPI',
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
    },
    orderStatus: {
        type: String,
        enum: ['processing', 'shipped', 'delivered', 'cancelled'],
        default: 'processing',
    },
    upiTransactionId: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.models.Order || mongoose.model('Order', OrderSchema);
