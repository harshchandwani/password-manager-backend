import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import userRoutes from './routes/user'; // Adjust paths as necessary
import passwordRoutes from './routes/password'; // Adjust paths as necessary
import authenticateJWT from './middleware/auth'; // Adjust paths as necessary

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Routes
app.use('/api/users', userRoutes); // User routes for registration and login
app.use('/api/passwords', authenticateJWT, passwordRoutes); // Password routes with JWT authentication

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
