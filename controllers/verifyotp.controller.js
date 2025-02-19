import bcrypt from "bcrypt";
import OTP from "../models/otp.model.js";
import prismaPostgres from "../config/prismaPostgres.config.js";
import { generateToken } from "../middlewares/auth.middleware.js";

export const verifyOtp = async (req, res) => {
    try {
        // Retrieve userId from the HTTP-only cookie instead of request body
        const userId = req.cookies.tempUserId;
        if (!userId) {
            return res.status(400).json({
                message: "Verification token missing. Please sign up again.",
            });
        }
        const { otp } = req.body;

        // For example, assume identifier is the user id:
        const otpRecord = await OTP.findOne({
            userId,
            isUsed: false,
        });
        if (!otpRecord) {
            return res
                .status(400)
                .json({ message: "OTP not found or already used" });
        }

        // Check if OTP is still valid
        const isValid = await bcrypt.compare(otp, otpRecord.otp);
        if (!isValid) {
            otpRecord.numberOfAttempts += 1;

            // Check if the maximum number of attempts is reached
            if (otpRecord.numberOfAttempts > 10) {
                otpRecord.isUsed = true;
                await otpRecord.save();
                return res.status(429).json({
                    message:
                        "Maximum attempts reached. Please request a new OTP.",
                });
            }

            await otpRecord.save();
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // Mark OTP as used
        otpRecord.isUsed = true;
        await otpRecord.save();

        // Update the user as verified in PostgreSQL
        await prismaPostgres.user.update({
            where: { id: parseInt(userId) },
            data: { isVerified: true },
        });

        // Generate token after successful OTP verification
        const user = await prismaPostgres.user.findUnique({
            where: { id: parseInt(userId) },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                avatarUrl: true,
            },
        });
        const token = generateToken(user);

        res.status(200).json({ message: "OTP verified", token });
    } catch (error) {
        console.log("OTP verification error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
