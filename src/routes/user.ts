import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client';
import authenticateJWT from '../middleware/auth';
import axios from 'axios';
import { addHours } from 'date-fns';
import { queueVerificationEmail } from '../utils/email';
const router = express.Router();

// Define the shape of the request body for registration and login
interface RegisterRequestBody {
    email: string;
    password: string;
    isActive: boolean;
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

        // Generate a verification token
        const token = jwt.sign({ email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        // Calculate expiration time (1 hour from now)
        const emailVerificationExpires = addHours(new Date(), 1);

        // Create the user with email verification details
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                isUserEmailVerified: false, // Set verification status to false
                emailVerificationToken: token,
                emailVerificationExpires,
            }
        });

        // Add email verification task to the Redis queue
        await queueVerificationEmail(email, token);

        res.status(201).json({ message: 'User created successfully. Please check your email for verification.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Login route modification
router.post('/login', async (req: Request, res: any) => {
    const { email, password } = req.body;

    try {
        // Find user
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user email is verified
        if (!user.isUserEmailVerified) {
            return res.status(403).json({ error: 'Please verify your email.' });
        }

        // Generate JWT token if verified
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
        res.status(200).json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

router.get('/profile', authenticateJWT, (req: any, res: any) => {
    res.json({ message: 'This is the user profile', user: req.user });
});

// Define the email verification route
router.post('/verify-email', async (req: Request, res: any) => {
    const { token } = req.body;
    // Ensure token is provided
    if (typeof token !== 'string') {
        return res.status(400).json({ error: 'Token is required' });
    }

    try {
        // Verify the token using JWT_SECRET
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
        const email = decoded.email;

        // Find the user in the database by email
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if the token matches and hasn't expired
        if (user.emailVerificationToken !== token || Date.now() > user.emailVerificationExpires!.getTime()) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        // Update user as verified and clear token fields
        await prisma.user.update({
            where: { email },
            data: {
                isUserEmailVerified: true,
                emailVerificationToken: null,
                emailVerificationExpires: null,
            },
        });

        res.status(200).json({ message: 'Email verification successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to verify email' });
    }
});

router.post('/resend-verification-email', async (req: Request, res: any) => {
    const { email } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        // Check if the user is found, unverified, and within the resend limit
        if (!user) return res.status(404).json({ error: "User not found" });
        if (user.isActive) return res.status(403).json({ error: "Account is deactivated" });
        if (user.isUserEmailVerified) return res.status(400).json({ error: "Email already verified" });
        if (user.resendEmailAttempts >= 5) {
            await prisma.user.update({
                where: { email },
                data: { isActive: true },
            });
            return res.status(403).json({ error: "Resend limit reached; account deactivated." });
        }

        // Generate a new token for verification
        const token = jwt.sign({ email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        // Update user's resend attempts and token details
        await prisma.user.update({
            where: { email },
            data: {
                emailVerificationToken: token,
                emailVerificationExpires: new Date(Date.now() + 3600 * 1000),
                resendEmailAttempts: { increment: 1 },
            },
        });

        // Add email verification task to the Redis queue
        await queueVerificationEmail(email, token);

        res.status(200).json({ message: "Verification email resent successfully." });
    } catch (error) {
        console.error("Error resending email:", error);
        res.status(500).json({ error: "Failed to resend verification email." });
    }
});

export default router;

