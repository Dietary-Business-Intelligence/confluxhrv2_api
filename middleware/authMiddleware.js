import JWT from 'jsonwebtoken'


export const GenerateToken = async (req, res) => {
    try {
        const em_email = req.body.em_email; // Assuming email is passed in the request body
        const payload = { email: em_email };
        const secretKey = process.env.JWT_SECRET; // Ensure you have a secret key stored in your environment variables
        const options = { expiresIn: '1h' }; // Token expiration time

        // Token generation
        const token = await new Promise((resolve, reject) => {
            JWT.sign(payload, secretKey, options, (err, token) => {
                if (err) return reject(err);
                resolve(token);
            });
        });

        res.status(200).json({ token }); // Send the token as a JSON response
    } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({ error: 'Token generation failed' });
    }
}

// Middleware to verify JWT token
export const verifyToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const secretKey = process.env.JWT_SECRET; // Ensure you have a secret key stored in your environment variables
    if (!token) {
        return res.status(403).json({ error: 'No token provided' });
    }

    try {
        const decoded = await new Promise((resolve, reject) => {
            JWT.verify(token, secretKey, (err, decoded) => {
                if (err) {
                    console.error(`JWT Verification Error: ${err.message}`);
                    return reject(new Error(`JWT Verification Error: ${err.message}`));
                }
                console.log('Decoded JWT:', decoded);
                resolve(decoded);
            });
        });

        req.decoded = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Failed to authenticate token' });
    }
}


