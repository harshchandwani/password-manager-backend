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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = __importDefault(require("../prisma/client"));
const auth_1 = __importDefault(require("../middleware/auth"));
const date_fns_1 = require("date-fns");
const email_1 = require("../utils/email");
const router = express_1.default.Router();
// Register a new user
router.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        // Check if user already exists
        const existingUser = yield client_1.default.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        // Hash the password
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        // Generate a verification token
        const token = jsonwebtoken_1.default.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Calculate expiration time (1 hour from now)
        const emailVerificationExpires = (0, date_fns_1.addHours)(new Date(), 1);
        // Create the user with email verification details
        const user = yield client_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                isUserEmailVerified: false, // Set verification status to false
                emailVerificationToken: token,
                emailVerificationExpires,
            }
        });
        // Add email verification task to the Redis queue
        yield (0, email_1.queueVerificationEmail)(email, token);
        res.status(201).json({ message: 'User created successfully. Please check your email for verification.' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
}));
// Login route modification
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        // Find user
        const user = yield client_1.default.user.findUnique({ where: { email } });
        if (!user || !(yield bcryptjs_1.default.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Check if user email is verified
        if (!user.isUserEmailVerified) {
            return res.status(403).json({ error: 'Please verify your email.' });
        }
        // Generate JWT token if verified
        const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ token });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
}));
router.get('/profile', auth_1.default, (req, res) => {
    res.json({ message: 'This is the user profile', user: req.user });
});
// Define the email verification route
router.post('/verify-email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.body;
    // Ensure token is provided
    if (typeof token !== 'string') {
        return res.status(400).json({ error: 'Token is required' });
    }
    try {
        // Verify the token using JWT_SECRET
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const email = decoded.email;
        // Find the user in the database by email
        const user = yield client_1.default.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if the token matches and hasn't expired
        if (user.emailVerificationToken !== token || Date.now() > user.emailVerificationExpires.getTime()) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }
        // Update user as verified and clear token fields
        yield client_1.default.user.update({
            where: { email },
            data: {
                isUserEmailVerified: true,
                emailVerificationToken: null,
                emailVerificationExpires: null,
            },
        });
        res.status(200).json({ message: 'Email verification successful' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to verify email' });
    }
}));
router.post('/resend-verification-email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    try {
        const user = yield client_1.default.user.findUnique({ where: { email } });
        // Check if the user is found, unverified, and within the resend limit
        if (!user)
            return res.status(404).json({ error: "User not found" });
        if (!user.isActive)
            return res.status(403).json({ error: "Account is deactivated" });
        if (user.isUserEmailVerified)
            return res.status(400).json({ error: "Email already verified" });
        if (user.resendEmailAttempts >= 5) {
            yield client_1.default.user.update({
                where: { email },
                data: { isActive: true },
            });
            return res.status(403).json({ error: "Resend limit reached; account deactivated." });
        }
        // Generate a new token for verification
        const token = jsonwebtoken_1.default.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Update user's resend attempts and token details
        yield client_1.default.user.update({
            where: { email },
            data: {
                emailVerificationToken: token,
                emailVerificationExpires: new Date(Date.now() + 3600 * 1000),
                resendEmailAttempts: { increment: 1 },
            },
        });
        // Add email verification task to the Redis queue
        yield (0, email_1.queueVerificationEmail)(email, token);
        res.status(200).json({ message: "Verification email resent successfully." });
    }
    catch (error) {
        console.error("Error resending email:", error);
        res.status(500).json({ error: "Failed to resend verification email." });
    }
}));
exports.default = router;
