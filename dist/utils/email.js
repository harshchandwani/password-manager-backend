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
exports.processEmailQueue = exports.queueVerificationEmail = void 0;
// src/utils/email.ts
const nodemailer_1 = __importDefault(require("nodemailer"));
const redis_1 = __importDefault(require("../utils/redis")); // Import Redis class
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const ejs_1 = __importDefault(require("ejs"));
dotenv_1.default.config();
// Set up nodemailer transporter
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});
// Function to send email directly
const sendEmail = (email, token) => __awaiter(void 0, void 0, void 0, function* () {
    const url = `${process.env.FRONTEND_URL}/verified-email?token=${token}`;
    const templatePath = path_1.default.join(__dirname, 'templates', 'verificationEmailTemplate.ejs');
    const htmlContent = yield ejs_1.default.renderFile(templatePath, { verification_link: url });
    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Verify Your Email',
        html: htmlContent,
    };
    try {
        yield transporter.sendMail(mailOptions);
    }
    catch (error) {
        console.log(error);
    }
    console.log("Verification email sent successfully.");
});
// Function to queue email for sending
const queueVerificationEmail = (email, token) => __awaiter(void 0, void 0, void 0, function* () {
    const redis = redis_1.default.getInstance();
    const emailData = { email, token };
    yield redis.addToQueue('email_queue', emailData); // Add email to Redis queue
    console.log("Email added to queue for sending.");
});
exports.queueVerificationEmail = queueVerificationEmail;
// Function to process the email queue
const processEmailQueue = () => __awaiter(void 0, void 0, void 0, function* () {
    const redis = redis_1.default.getInstance();
    while (true) {
        const emailData = yield redis.consumeFromQueue('email_queue'); // Consume from Redis queue
        if (emailData) {
            const { email, token } = emailData;
            try {
                yield sendEmail(email, token); // Send the email
            }
            catch (error) {
                console.error("Error sending email:", error);
            }
        }
    }
});
exports.processEmailQueue = processEmailQueue;
