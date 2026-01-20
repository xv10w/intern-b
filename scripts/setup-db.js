const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI not found in .env.local');
    process.exit(1);
}

// Define schemas inline to avoid import issues
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now },
});

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: String, required: true },
    image: { type: String, required: true },
    categories: { type: [String], required: true },
    brand: { type: String, default: '' },
    currentInventory: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
});

/** @type {any} */
const User = mongoose.models.User || mongoose.model('User', UserSchema);
/** @type {any} */
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// Import inventory data
const inventory = require('../utils/inventory').default;

async function setupDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Create admin user
        console.log('\n👤 Creating admin user...');
        const adminEmail = 'admin@store.com';
        const adminPassword = 'admin123';

        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('ℹ️  Admin user already exists');
        } else {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            await User.create({
                name: 'Admin User',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
            });
            console.log('✅ Admin user created');
            console.log('   📧 Email: admin@store.com');
            console.log('   🔑 Password: admin123');
        }

        // Seed products
        console.log('\n📦 Seeding products...');
        const productCount = await Product.countDocuments();

        if (productCount > 0) {
            console.log(`ℹ️  Database already has ${productCount} products`);
        } else {
            const productsToInsert = inventory.map(({ ...product }) => product);
            await Product.insertMany(productsToInsert);
            console.log(`✅ Seeded ${productsToInsert.length} products`);
        }

        console.log('\n🎉 Database setup complete!');
        console.log('\n📝 Next steps:');
        console.log('   1. Run: npm run dev');
        console.log('   2. Visit: http://localhost:3001');
        console.log('   3. Login with: admin@store.com / admin123');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

setupDatabase();
