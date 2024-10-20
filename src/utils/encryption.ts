import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // AES-GCM standard IV length is 12 bytes
const KEY_LENGTH = 32; // AES-256 requires a 32-byte key
const SALT_LENGTH = 16; // Salt for key derivation
const TAG_LENGTH = 16; // Authentication tag length

// Function to derive a key from a password and salt
const getKey = (password: string, salt: Buffer): Buffer => {
    return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
};

// Encrypt function
export const encryptPassword = (text: string, password: string): string => {
    const iv = crypto.randomBytes(IV_LENGTH); // Generate random IV
    const salt = crypto.randomBytes(SALT_LENGTH); // Generate random salt
    const key = getKey(password, salt); // Derive encryption key

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    // Return IV, salt, authTag, and encrypted text combined as a string
    return `${iv.toString('hex')}:${salt.toString('hex')}:${authTag}:${encrypted}`;
};

// Decrypt function
export const decryptPassword = (encryptedText: string, password: string): string => {
    const [ivHex, saltHex, authTagHex, encrypted] = encryptedText.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const salt = Buffer.from(saltHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getKey(password, salt); // Derive the same key using salt

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag); // Set the authentication tag

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

// import { promisify } from "util";
// import type { Encoding, BinaryLike } from "crypto";
// import { scrypt, randomBytes, createCipheriv, createDecipheriv } from "crypto";

// const ALGORITHM = {
//     BLOCK_CIPHER: 'aes-256-gcm',
//     IV_BYTE_LEN: 16,
//     SALT_BYTE_LEN: 32,
//     KEY_BYTE_LEN: 32,
//     AUTH_TAG_BYTE_LEN: 16,
// } as const;

// const generateIV = () => randomBytes(ALGORITHM.IV_BYTE_LEN);
// const generateSalt = () => randomBytes(ALGORITHM.SALT_BYTE_LEN);

// const getDerivedKey = (secret: BinaryLike, salt: BinaryLike) => {
//     return promisify(scrypt)(secret, salt, ALGORITHM.KEY_BYTE_LEN) as Promise<Buffer>;
// };

// export const encrypt = async (message: string, secret: BinaryLike) => {
//     const inputEncoding = "utf-8" satisfies Encoding;
//     const outputEncoding = "base64" satisfies Encoding;

//     const iv = generateIV();
//     const salt = generateSalt();
//     const key = await getDerivedKey(secret, salt);
//     const algo = ALGORITHM.BLOCK_CIPHER;
//     const cipher = createCipheriv(algo, key, iv, { authTagLength: ALGORITHM.AUTH_TAG_BYTE_LEN });
//     const cipherText = Buffer.concat([cipher.update(message, inputEncoding), cipher.final()]);

//     return (
//         Buffer
//             .concat([
//                 iv,
//                 salt,
//                 cipherText,
//                 cipher.getAuthTag()
//             ])
//             .toString(outputEncoding)
//     );
// };
// export const decrypt = async (encryption: string, secret: BinaryLike) => {
//     const inputEncoding = "base64" satisfies Encoding;
//     const outputEncoding = "utf-8" satisfies Encoding;

//     const encryptionBuffer = Buffer.from(encryption, inputEncoding);

//     // Extract the IV, Salt, CipherText, and AuthTag properly
//     const iv = encryptionBuffer.slice(0, ALGORITHM.IV_BYTE_LEN);
//     const salt = encryptionBuffer.slice(ALGORITHM.IV_BYTE_LEN, ALGORITHM.IV_BYTE_LEN + ALGORITHM.SALT_BYTE_LEN);

//     // The rest of the data includes the ciphertext followed by the authTag
//     const cipherTextAndAuthTag = encryptionBuffer.slice(ALGORITHM.IV_BYTE_LEN + ALGORITHM.SALT_BYTE_LEN);

//     // Extract the authTag (last 16 bytes) and cipherText (everything before the authTag)
//     const authTag = cipherTextAndAuthTag.slice(-ALGORITHM.AUTH_TAG_BYTE_LEN);
//     const cipherText = cipherTextAndAuthTag.slice(0, -ALGORITHM.AUTH_TAG_BYTE_LEN);

//     // Derive the encryption key from the secret and the salt
//     const key = await getDerivedKey(secret, salt);

//     // Create a decipher instance with the correct algorithm, key, and IV
//     const decipher = createDecipheriv(ALGORITHM.BLOCK_CIPHER, key, iv, { authTagLength: ALGORITHM.AUTH_TAG_BYTE_LEN });

//     // Set the authentication tag properly
//     decipher.setAuthTag(authTag);

//     // Perform decryption
//     return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString(outputEncoding);
// };
