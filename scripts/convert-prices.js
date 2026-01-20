const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

// Price conversion map: USD to INR (1 USD = 83 INR)
const priceConversion = {
    '1000': '83000',
    '800': '66400',
    '900': '74700',
    '1200': '99600',
    '500': '41500',
    '650': '53950',
    '1230': '102090',
    '300': '24900',
    '825': '68475',
    '720': '59760',
    '2000': '166000',
    '1100': '91300',
    '600': '49800',
    '775': '64325',
    '1600': '132800',
    '550': '45650',
};

const ProductSchema = new mongoose.Schema({
    name: String,
    price: String,
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function convertPrices() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('\n💱 Converting prices from USD to INR...');

        for (const [usd, inr] of Object.entries(priceConversion)) {
            const result = await Product.updateMany(
                { price: usd },
                { $set: { price: inr } }
            );
            if (result.modifiedCount > 0) {
                console.log(`   Updated ${result.modifiedCount} products: $${usd} → ₹${inr}`);
            }
        }

        const totalProducts = await Product.countDocuments();
        console.log(`\n✅ Price conversion complete! Total products: ${totalProducts}`);

    } catch (error) {
        console.error('❌ Conversion failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

convertPrices();
