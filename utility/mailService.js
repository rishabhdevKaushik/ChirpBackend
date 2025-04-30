import OTP from "../models/otp.model.js";
import ResetToken from "../models/resetToken.model.js";
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
            subject: "Verify OTP for Chirp",
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
        console.log(`Error while mailing otp\n${error}`);
    }
};

export const checkOtp = async (otp, userId) => {
    try {
        // Find OTP record
        const otpRecord = await OTP.findOne({
            userId: userId,
            isUsed: false,
        }).sort({ createdAt: -1 });
        
        if (!otpRecord) {
            return { status: false, message: "Otp not found" };
        }

        // Check if OTP is valid
        const isValid = await bcrypt.compare(otp, otpRecord.otp);
        if (!isValid) {
            otpRecord.numberOfAttempts += 1;

            // Check if the maximum number of attempts is reached
            if (otpRecord.numberOfAttempts > 10) {
                otpRecord.isUsed = true;
                await otpRecord.save();
                return false;
            }

            await otpRecord.save();
            return { status: false, message: "Wrong otp" };
        }

        // Mark OTP as used
        otpRecord.isUsed = true;
        await otpRecord.save();

        return { status: true, otpRecord };
    } catch (error) {
        console.log("OTP Checking error:", error);
        return {
            status: false,
            message: "Internal server error",
            statusCode: 500,
        };
    }
};

export const generateAndSendPasswordResetLink = async (
    recipientEmail,
    token
) => {
    try {
        // Generate whole resetLink
        const resetLink = `${process.env.FRONTEND_URL}/ChangePassword?token=${token}`;

        // const hashedToken = await bcrypt.hash(token, 10)

        // Store resetToken in MongoDB
        await ResetToken.create({
            email: recipientEmail,
            token: token
        });

        const mailOptions = {
            to: recipientEmail,
            subject: "Password Reset Request",
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <p>If you requested a password reset, click the following link:</p>
                    <p">${resetLink}</p>
                    <p>If you did not request this, please ignore this email.</p>
                    <p style="color: #ff4444;"><strong>This link expires in 1 hour</strong></p>
                </div>
            `,
        };

        // Send the resetLink via email
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.log(`Error while mailing resetLink\n${error}`);
    }
};
