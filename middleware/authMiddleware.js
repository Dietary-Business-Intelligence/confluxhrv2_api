const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET;


function generateToken(em_email) {
    return jwt.sign({ em_email }, secretKey, { expiresIn: '1h' }); // Token expires in 1 hour
}

// Middleware to verify JWT token
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1]; // Assuming token is passed in the "Authorization" header
    if (!token) {
        return res.status(403).json({ error: 'No token provided' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to authenticate token' });
        }

        // If token is valid, save decoded information to request for use in other routes
        req.decoded = decoded;
        next();
    });
}

module.exports = { generateToken, verifyToken };