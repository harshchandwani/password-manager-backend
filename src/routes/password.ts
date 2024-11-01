import express, { Request, Response } from 'express';
import prisma from '../prisma/client';
import { RequestWithUser } from '../middleware/auth';
import { encryptPassword, decryptPassword } from '../utils/encryption';

const router = express.Router();
// Add a new user password
router.post('/', async (req: RequestWithUser, res: any) => {
    const { website, websiteName, username, password } = req.body;

    // Validate request body
    if (!website || !websiteName || !username || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user is authenticated
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Encrypt the password (await the Promise)
        const encryptedPassword = await encryptPassword(password, String(process.env.PASSWORD_ENCRYPTION_SECRET));

        const newUserPassword = await prisma.userPassword.create({
            data: {
                website,
                websiteName,
                username,
                password: encryptedPassword, // Save encrypted password
                userId: String(req.user.id), // Ensure user ID is a string
            },
        });
        res.status(201).json(newUserPassword);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create user password' });
    }
});

// Get all user passwords for the authenticated user
router.get('/', async (req: RequestWithUser, res: any) => {
    // Check if user is authenticated
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Fetch all passwords belonging to the authenticated user
        const userPasswords = await prisma.userPassword.findMany({
            where: { userId: String(req.user.id) },
            orderBy: [
                {
                    websiteName: 'asc',
                },
                {
                    updatedAt: 'desc'
                }
            ]
        });

        // Decrypt passwords before sending them in the response
        const decryptedPasswords = await Promise.all(
            userPasswords.map(async (entry) => {
                const decryptedPassword = await decryptPassword(entry.password, String(process.env.PASSWORD_ENCRYPTION_SECRET)); // Decrypt the password
                return { ...entry, password: decryptedPassword }; // Attach decrypted password to the entry
            })
        );

        res.status(200).json(decryptedPasswords);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve user passwords' });
    }
});

// Get a specific user password by ID with decryption
router.get('/:id', async (req: RequestWithUser, res: any) => {
    const { id } = req.params;

    // Ensure user is authenticated
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Fetch the password entry by ID
        const userPassword = await prisma.userPassword.findUnique({
            where: { id },
        });

        // Check if the entry exists and belongs to the authenticated user
        if (!userPassword || userPassword.userId !== String(req.user.id)) {
            return res.status(404).json({ error: 'Password entry not found' });
        }

        // Decrypt the password
        const decryptedPassword = await decryptPassword(
            userPassword.password,
            String(process.env.PASSWORD_ENCRYPTION_SECRET)
        );

        // Return the entry with the decrypted password
        res.json({ ...userPassword, password: decryptedPassword });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch password entry' });
    }
});



// Update a user password
router.put('/:id', async (req: RequestWithUser, res: any) => {
    const { id } = req.params;
    const { website, websiteName, username, password } = req.body;

    // Validate request body
    if (!website || !websiteName || !username || !password || !id) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user is authenticated
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {

        // Encrypt the password (await the Promise)
        const encryptedPassword = await encryptPassword(password, String(process.env.PASSWORD_ENCRYPTION_SECRET));

        const updatedUserPassword = await prisma.userPassword.update({
            where: { id },
            data: {
                website,
                websiteName,
                username,
                password: encryptedPassword,
            },
        });
        res.json(updatedUserPassword);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update user password' });
    }
});

// Delete a user password
router.delete('/:id', async (req: RequestWithUser, res: Response) => {
    const { id } = req.params;

    try {
        await prisma.userPassword.delete({
            where: { id },
        });
        res.status(204).json("Deleted Successfully");
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete user password' });
    }
});

export default router;
