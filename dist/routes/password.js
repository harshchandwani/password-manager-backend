"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = __importDefault(require("../prisma/client"));
const encryption_1 = require("../utils/encryption");
const router = express_1.default.Router();
// Add a new user password
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const encryptedPassword = yield (0, encryption_1.encryptPassword)(password, String(process.env.PASSWORD_ENCRYPTION_SECRET));
        const newUserPassword = yield client_1.default.userPassword.create({
            data: {
                website,
                websiteName,
                username,
                password: encryptedPassword, // Save encrypted password
                userId: String(req.user.id), // Ensure user ID is a string
            },
        });
        res.status(201).json(newUserPassword);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create user password' });
    }
}));
// Get all user passwords for the authenticated user
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if user is authenticated
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        // Fetch all passwords belonging to the authenticated user
        const userPasswords = yield client_1.default.userPassword.findMany({
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
        const decryptedPasswords = yield Promise.all(userPasswords.map((entry) => __awaiter(void 0, void 0, void 0, function* () {
            const decryptedPassword = yield (0, encryption_1.decryptPassword)(entry.password, String(process.env.PASSWORD_ENCRYPTION_SECRET)); // Decrypt the password
            return Object.assign(Object.assign({}, entry), { password: decryptedPassword }); // Attach decrypted password to the entry
        })));
        res.status(200).json(decryptedPasswords);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve user passwords' });
    }
}));
// Get a specific user password by ID with decryption
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    // Ensure user is authenticated
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        // Fetch the password entry by ID
        const userPassword = yield client_1.default.userPassword.findUnique({
            where: { id },
        });
        // Check if the entry exists and belongs to the authenticated user
        if (!userPassword || userPassword.userId !== String(req.user.id)) {
            return res.status(404).json({ error: 'Password entry not found' });
        }
        // Decrypt the password
        const decryptedPassword = yield (0, encryption_1.decryptPassword)(userPassword.password, String(process.env.PASSWORD_ENCRYPTION_SECRET));
        // Return the entry with the decrypted password
        res.json(Object.assign(Object.assign({}, userPassword), { password: decryptedPassword }));
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch password entry' });
    }
}));
// Update a user password
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const encryptedPassword = yield (0, encryption_1.encryptPassword)(password, String(process.env.PASSWORD_ENCRYPTION_SECRET));
        const updatedUserPassword = yield client_1.default.userPassword.update({
            where: { id },
            data: {
                website,
                websiteName,
                username,
                password: encryptedPassword,
            },
        });
        res.json(updatedUserPassword);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update user password' });
    }
}));
// Delete a user password
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield client_1.default.userPassword.delete({
            where: { id },
        });
        res.status(204).json("Deleted Successfully");
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete user password' });
    }
}));
exports.default = router;
