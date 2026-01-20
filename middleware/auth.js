const { verifyToken } = require('../utils/auth');

/**
 * Authentication middleware for API routes
 * Verifies JWT token from cookies and attaches user to request
 */
function authMiddleware(handler) {
    return async (req, res) => {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Attach user info to request
        req.user = decoded;

        return handler(req, res);
    };
}

/**
 * Admin-only middleware
 * Must be used after authMiddleware
 */
function adminMiddleware(handler) {
    return authMiddleware(async (req, res) => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        return handler(req, res);
    });
}

module.exports = {
    authMiddleware,
    adminMiddleware
};
