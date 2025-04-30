import prismaPostgres from "../config/prismaPostgres.config.js";
import { generateToken } from "../middlewares/auth.middleware.js";
import { checkOtp, generateAndSendOtp } from "../utility/mailService.js";

export const verifyOtp = async (req, res) => {
    try {
        const { tempUserId, otp } = req.body;
        if (!tempUserId || !otp) {
            return res.status(400).json({
                message: "tempUserId or otp missing",
            });
        }

        const chkOtp = await checkOtp(otp, tempUserId);
        if (chkOtp.status === false) {
            return res
                .status(chkOtp.statusCode || 400)
                .json({ message: chkOtp.message });
        }

        // Update the user as verified in PostgreSQL using email
        const user = await prismaPostgres.user.update({
            where: { email: chkOtp.otpRecord.email },
            data: { isVerified: true },
        });

        const token = generateToken(user);

        res.status(200).json({ message: "OTP verified", token });
    } catch (error) {
        console.log("OTP verification error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const resendOtp = async (req, res) => {
    try {
        const { tempUserId, email } = req.body;
        await generateAndSendOtp(tempUserId, email);
        res.status(201).json({ message: "OTP sent successfully" });
    } catch (error) {
        console.log("OTP resending error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
