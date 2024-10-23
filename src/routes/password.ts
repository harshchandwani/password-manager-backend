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


// Update a user password
router.put('/:id', async (req: RequestWithUser, res: Response) => {
    const { id } = req.params;
    const { website, websiteName, username, password } = req.body;

    try {
        const updatedUserPassword = await prisma.userPassword.update({
            where: { id },
            data: {
                website,
                websiteName,
                username,
                password,
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
