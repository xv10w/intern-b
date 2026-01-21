require('dotenv').config({ path: './.env.local' });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const { verifyToken, comparePassword, signToken, getUserPayload, hashPassword } = require('./utils/auth');
/** @type {any} */
const Product = require('./models/Product');
/** @type {any} */
const User = require('./models/User');
/** @type {any} */
const Order = require('./models/Order');
const inventory = require('./utils/inventory');
const { serialize } = require('cookie');

/** @typedef {import('express').Request & { user: any }} AuthRequest */
const app = express();
const PORT = Number(process.env.PORT) || 3001;

// --- MIDDLEWARE ---
const allowedOrigins = [
  'https://intern-beta-nine.vercel.app',
  'https://intern.vercel.app',
  process.env.CORS_ORIGIN,
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow any vercel.app subdomain
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all for now in production
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// --- AUTH MIDDLEWARE ---
const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
  req.user = decoded;
  next();
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch(err => console.error("MongoDB connection error:", err));

// --- API ROUTES ---

// Product Routes
app.get('/api/products/seed', authMiddleware, adminMiddleware, async (/** @type {AuthRequest} */ req, res) => {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      const productsToInsert = inventory.map(({ ...product }) => product);
      await Product.insertMany(productsToInsert);
      return res.status(200).json({
        success: true,
        message: `Seeded ${productsToInsert.length} products successfully`,
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Database already seeded',
    });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error seeding database',
      error: error.message,
    });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    return res.status(200).json({ success: true, product });
  } catch (error) {
    console.error('Get product error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching product' });
  }
});

// Inventory Routes
app.get('/api/inventory', async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error('Get products error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching products' });
  }
});

app.post('/api/inventory', authMiddleware, adminMiddleware, async (/** @type {AuthRequest} */ req, res) => {
  try {
    const { name, description, price, image, categories, brand, currentInventory } = req.body;
    if (!name || !description || !price || !image || !categories || currentInventory === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }
    const product = await Product.create({
      name, description, price, image, categories, brand: brand || '', currentInventory,
    });
    return res.status(201).json({ success: true, message: 'Product created successfully', product });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({ success: false, message: 'Error creating product' });
  }
});

app.put('/api/inventory', authMiddleware, adminMiddleware, async (/** @type {AuthRequest} */ req, res) => {
  try {
    const { id, ...updateData } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }
    const product = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    return res.status(200).json({ success: true, message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({ success: false, message: 'Error updating product' });
  }
});

app.delete('/api/inventory', authMiddleware, adminMiddleware, async (/** @type {AuthRequest} */ req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    return res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({ success: false, message: 'Error deleting product' });
  }
});

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const token = signToken(getUserPayload(user));
    const isProduction = process.env.NODE_ENV === 'production';
    const cookie = serialize('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // Critical for cross-site auth
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    res.setHeader('Set-Cookie', cookie);
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookie = serialize('token', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: -1,
      path: '/',
    });
    res.setHeader('Set-Cookie', cookie);
    return res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ success: false, message: 'Server error during logout' });
  }
});

app.get('/api/auth/me', authMiddleware, async (/** @type {AuthRequest} */ req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'user',
    });
    const token = signToken(getUserPayload(user));
    const isProduction = process.env.NODE_ENV === 'production';
    const cookie = serialize('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    res.setHeader('Set-Cookie', cookie);
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// Order Routes
app.get('/api/orders', authMiddleware, async (/** @type {AuthRequest} */ req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching orders' });
  }
});

app.post('/api/orders', authMiddleware, async (/** @type {AuthRequest} */ req, res) => {
  try {
    const { items, totalAmount, shippingAddress, paymentMethod } = req.body;
    if (!items || !items.length || !totalAmount || !shippingAddress) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ${item.name} not found` });
      }
      if (product.currentInventory < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient inventory for ${product.name}` });
      }
    }
    const order = await Order.create({
      user: req.user.id,
      items,
      totalAmount,
      shippingAddress,
      paymentMethod: paymentMethod || 'UPI',
      paymentStatus: 'pending',
      orderStatus: 'processing',
    });
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { currentInventory: -item.quantity } });
    }
    await order.populate('items.product');
    return res.status(201).json({ success: true, message: 'Order created successfully', order });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({ success: false, message: 'Error creating order' });
  }
});

app.get('/api/orders/:id', authMiddleware, async (/** @type {AuthRequest} */ req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findOne({
      _id: id,
      user: req.user.id,
    }).populate('items.product');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching order' });
  }
});

// --- START THE SERVER ---
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});