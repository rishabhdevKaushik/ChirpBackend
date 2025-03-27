import bcrypt from "bcryptjs";
import OTP from "../models/otp.model.js";
import prismaPostgres from "../config/prismaPostgres.config.js";
import { generateToken } from "../middlewares/auth.middleware.js";

export const verifyOtp = async (req, res) => {
    try {
        const { tempUserId, otp } = req.body;
        if (!tempUserId || !otp) {
            return res.status(400).json({
                message: "tempUserId or otp missing",
            });
        }

        // Find OTP record
        const otpRecord = await OTP.findOne({
            userId: tempUserId,
            isUsed: false,
        }).sort({ createdAt: -1 });
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

        // Update the user as verified in PostgreSQL using email
        const user = await prismaPostgres.user.update({
            where: { email: otpRecord.email },
            data: { isVerified: true },
        });

        const token = generateToken(user);

        res.status(200).json({ message: "OTP verified", token });
    } catch (error) {
        console.log("OTP verification error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
