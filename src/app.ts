import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import userRoutes from './routes/user'; // Adjust paths as necessary
import passwordRoutes from './routes/password'; // Adjust paths as necessary
import authenticateJWT from './middleware/auth'; // Adjust paths as necessary
import { processEmailQueue } from './utils/email';
import Redis from './utils/redis';
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Redis
const redis = Redis.getInstance();
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
app.use(cors());
app.use(limiter);
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Routes
app.use('/api/users', userRoutes); // User routes for registration and login
app.use('/api/passwords', authenticateJWT, passwordRoutes); // Password routes with JWT authentication

// Background task for processing email queue
setImmediate(() => {
    console.log("Starting email queue processing...");
    processEmailQueue();
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});