import prismaPostgres from "../config/prismaPostgres.config.js";
import { generateToken } from "../middlewares/auth.middleware.js";
import { checkOtp } from "../utility/mailService.js";

export const verifyOtp = async (req, res) => {
    try {
        const { tempUserId, otp } = req.body;
        if (!tempUserId || !otp) {
            return res.status(400).json({
                message: "tempUserId or otp missing",
            });
        }

        const checkOtp = await checkOtp(otp, tempUserId);
        if (!checkOtp.status) {
            return res
                .status(checkOtp.statusCode || 400)
                .json({ message: checkOtp.message });
        }

        // Update the user as verified in PostgreSQL using email
        const user = await prismaPostgres.user.update({
            where: { email: checkOtp.otpRecord.email },
            data: { isVerified: true },
        });

        const token = generateToken(user);

        res.status(200).json({ message: "OTP verified", token });
    } catch (error) {
        console.log("OTP verification error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
