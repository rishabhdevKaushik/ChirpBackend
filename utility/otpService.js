import OTP from "../models/otp.model.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    port: 465,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD,
    },
});

export const generateAndSendOtp = async (userId, recipientEmail) => {
    try {
        // Generate a random 6-digit OTP (you could use a library for better randomness)
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash the OTP before storing it
        const hashedOtp = await bcrypt.hash(otpCode, 10);

        // Store OTP in MongoDB
        await OTP.create({
            userId,
            otp: hashedOtp,
            numberOfAttempts: 0,
            isUsed: false,
        });

        const mailOptions = {
            to: recipientEmail,
            subject: "Verify Email id for Chirp",
            html: `<h3>Enter <h3><b>${otpCode}</h3> in website to verify your email.</b></h3><br><p>This code <b>expires in 15 minutes</b></p>`,
        };
        // Send the OTP via email
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.log(`Error while sending otp\n${error}`);
    }
};
