const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: {error: "Too many requests, slow down"}
});

module.exports = limiter;
