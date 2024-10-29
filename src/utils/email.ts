// src/utils/email.ts
import nodemailer from 'nodemailer';
import Redis from "../utils/redis";  // Import Redis class
import dotenv from "dotenv";

dotenv.config();
// Set up nodemailer transporter
const transporter = nodemailer.createTransport({
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
const sendEmail = async (email: string, token: string) => {
    const url = `${process.env.FRONTEND_URL}/verified-email?token=${token}`;
    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Verify Your Email',
        html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
    };
    try {
        await transporter.sendMail(mailOptions);
    }
    catch (error) {
        console.log(error);
    }

    console.log("Verification email sent successfully.");
};

// Function to queue email for sending
export const queueVerificationEmail = async (email: string, token: string) => {
    const redis = Redis.getInstance();
    const emailData = { email, token };
    await redis.addToQueue('email_queue', emailData); // Add email to Redis queue
    console.log("Email added to queue for sending.");
};

// Function to process the email queue
export const processEmailQueue = async () => {
    const redis = Redis.getInstance();
    while (true) {
        const emailData = await redis.consumeFromQueue('email_queue'); // Consume from Redis queue
        if (emailData) {
            const { email, token } = emailData;
            try {
                await sendEmail(email, token); // Send the email
            } catch (error) {
                console.error("Error sending email:", error);
            }
        }
    }
};
