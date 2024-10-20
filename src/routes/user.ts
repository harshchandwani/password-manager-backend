import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma/client';

const router = express.Router();

// Define the shape of the request body for registration and login
interface RegisterRequestBody {
    email: string;
    password: string;
}

// Register a new user
router.post('/register', async (req: Request<{}, {}, RegisterRequestBody>, res: any) => {
    const { email, password } = req.body;

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            }
        });

        res.status(201).json({ message: 'User created successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Login a user
router.post('/login', async (req: Request<{}, {}, RegisterRequestBody>, res: any) => {
    const { email, password } = req.body;

    try {
        // Find the user by email
        const user = await prisma.user.findUnique({
            where: { email }
        });

        // Check if user exists
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Compare the password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Successfully logged in (you can generate a token here if you plan to use JWT)
        res.status(200).json({ message: 'Login successful', user: { id: user.id, email: user.email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
