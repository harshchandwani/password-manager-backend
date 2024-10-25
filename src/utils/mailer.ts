import nodemailer from "nodemailer";


const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const SENDMAIL = async (mailDetails: any) => {
    try {
        const info = await transporter.sendMail(mailDetails);
        console.log("Email sent successfully");
        console.log("MESSAGE ID: ", info.messageId);
        return info;
    } catch (error) {
        console.log("Error sending email:", error);
        throw error;
    }
};

export default SENDMAIL;
