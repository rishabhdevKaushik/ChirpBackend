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

export const generateAndSendOtp = async (hashedUserId, recipientEmail) => {
    try {
        // Generate a random 6-digit OTP 
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash the OTP before storing it
        const hashedOtp = await bcrypt.hash(otpCode, 10);

        // Store OTP in MongoDB 
        await OTP.create({
            userId: hashedUserId,
            email: recipientEmail,
            otp: hashedOtp,
            numberOfAttempts: 0,
            isUsed: false,
        });

        const mailOptions = {
            to: recipientEmail,
            subject: "Verify Email for Chirp",
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center;">
                    <p>Your verification code is:</p>
                    <h1 style="font-size: 36px; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">${otpCode}</h1>
                    <p>Enter this code on the website to verify your email.</p>
                    <p style="color: #ff4444;"><strong>This code expires in 15 minutes</strong></p>
                </div>
            `,
        };
        // Send the OTP via email
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.log(`Error while sending otp\n${error}`);
    }
};
