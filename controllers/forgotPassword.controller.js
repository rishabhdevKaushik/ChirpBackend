import bcrypt from "bcryptjs";
import { generateAndSendPasswordResetLink } from "../utility/mailService.js";
import ResetToken from "../models/resetToken.model.js";
import prismaPostgres from "../config/prismaPostgres.config.js";

const JWT_SECRET = process.env.JWT_SECRET_KEY;

// Generate a secure random token
function generateToken(email) {
    const accessToken = jwt.sign(
        {
            userEmail: email,
        },
        JWT_SECRET,
        {
            expiresIn: "1h",
        }
    );

    return accessToken;
}

// Forgot Password (sends reset email)
export const forgotPassowrd = async (req, res) => {
    const { email } = req.body;
    try {
        // Look up the user by email (case-sensitive match here)
        const user = users.find((u) => u.email === email);
        if (!user) {
            return res.status(400).json({ error: "User not found." });
        }

        // Generate a secure token and compute its SHA-256 hash
        const token = generateToken(email);
        const tokenHash = await bcrypt.hash(token, 10);

        // Send the password reset email
        await generateAndSendPasswordResetLink(user.email, token);
        return res.status(201).json({
            message: "Reset link sent to your email.",
        });
    } catch (error) {
        console.log("Error while sending password reset link:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Reset Password (updates password)
export const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) {
            return res
                .status(400)
                .json({ error: "Token and new password are required." });
        }

        const resetTokenRecord = await ResetToken.findOne({
            token: resetToken,
        }).sort({ createdAt: -1 });
        if (!resetTokenRecord) {
            return res.status(401).json({ message: "Token not found" });
        }

        const user = await prisma.user.findUnique({
            where: {
                email: resetTokenRecord.email,
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updatedUser = await prismaPostgres.user.update({
            where: {
                email: resetTokenRecord.email,
            },
            data: {
                password: hashedPassword,
            },
        });

        // Delete resetTokenRecord
        await ResetToken.deleteOne({ _id: resetTokenRecord._id });

        // Generate refresh and access tokens so no login required
        const token = generateToken(updatedUser);

        // Hash the refresh token for storage
        const hashedRefreshToken = await bcrypt.hash(token.refreshToken, 10);

        // Store hashed refresh token record
        await prismaPostgres.refreshToken.create({
            data: {
                token: hashedRefreshToken,
                userid: updatedUser.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            },
        });

        // Respond with success message
        res.status(200).json({
            message: "Password has been reset successfully.",
            token
        });
    } catch (error) {
        console.log("Error while reseting password:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
