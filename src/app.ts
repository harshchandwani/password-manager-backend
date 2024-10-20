import express from 'express';
import userRoutes from './routes/user';
import prisma from './prisma/client';

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);

// Basic route
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
