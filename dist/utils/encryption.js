"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptPassword = exports.encryptPassword = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // AES-GCM standard IV length is 12 bytes
const KEY_LENGTH = 32; // AES-256 requires a 32-byte key
const SALT_LENGTH = 16; // Salt for key derivation
const TAG_LENGTH = 16; // Authentication tag length
// Function to derive a key from a password and salt
const getKey = (password, salt) => {
    return crypto_1.default.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
};
// Encrypt function
const encryptPassword = (text, password) => {
    const iv = crypto_1.default.randomBytes(IV_LENGTH); // Generate random IV
    const salt = crypto_1.default.randomBytes(SALT_LENGTH); // Generate random salt
    const key = getKey(password, salt); // Derive encryption key
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    // Return IV, salt, authTag, and encrypted text combined as a string
    return `${iv.toString('hex')}:${salt.toString('hex')}:${authTag}:${encrypted}`;
};
exports.encryptPassword = encryptPassword;
// Decrypt function
const decryptPassword = (encryptedText, password) => {
    const [ivHex, saltHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const salt = Buffer.from(saltHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getKey(password, salt); // Derive the same key using salt
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag); // Set the authentication tag
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};
exports.decryptPassword = decryptPassword;
