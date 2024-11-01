"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const user_1 = __importDefault(require("./routes/user")); // Adjust paths as necessary
const password_1 = __importDefault(require("./routes/password")); // Adjust paths as necessary
const auth_1 = __importDefault(require("./middleware/auth")); // Adjust paths as necessary
const email_1 = require("./utils/email");
const redis_1 = __importDefault(require("./utils/redis"));
const rateLimit = require('express-rate-limit');
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Initialize Redis
const redis = redis_1.default.getInstance();
redis.ping().then((res) => {
    console.log(`Redis Connected PING:${res}`);
}).catch((error) => {
    console.error("Error connecting to Redis:", error);
    process.exit(1);
});
// Define a rate limit rule
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes.'
});
// Middleware
app.use((0, cors_1.default)());
app.use(limiter);
app.use(body_parser_1.default.json()); // Parse JSON request bodies
app.use(body_parser_1.default.urlencoded({ extended: true })); // Parse URL-encoded request bodies
// Routes
app.use('/api/users', user_1.default); // User routes for registration and login
app.use('/api/passwords', auth_1.default, password_1.default); // Password routes with JWT authentication
// Background task for processing email queue
setImmediate(() => {
    console.log("Starting email queue processing...");
    (0, email_1.processEmailQueue)();
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
