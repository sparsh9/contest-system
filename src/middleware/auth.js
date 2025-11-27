const jwt = require("jsonwebtoken");

function auth(requiredRoles = []) {
    return (req, res, next) => {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({error: "No token provided"});

        try {
            const user = jwt.verify(token, process.env.JWT_SECRET);
            req.user = user;

            if (requiredRoles.length && !requiredRoles.includes(user.role)) {
                return res.status(403).json({error: "Access forbidden for your role"});
            }

            next();
        } catch {
            res.status(401).json({error: "Invalid or expired token"});
        }
    };
}

module.exports = auth;
