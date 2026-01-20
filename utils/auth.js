const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

/**
 * Sign a JWT token
 */
exports.signToken = function(payload) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '7d', // Token expires in 7 days
    });
}

/**
 * Verify a JWT token
 */
exports.verifyToken = function(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Hash a password
 */
exports.hashPassword = async function(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

/**
 * Compare password with hashed password
 */
exports.comparePassword = async function(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
}

/**
 * Extract user data for JWT payload (exclude sensitive info)
 */
exports.getUserPayload = function(user) {
    return {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
    };
}
