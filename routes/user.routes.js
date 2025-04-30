import express from "express";
import upload from "../config/multer.config.js";
import {
    authenticateToken,
    refreshAccessToken,
} from "../middlewares/auth.middleware.js";
import {
    createUser,
    deleteUser,
    findUser,
    loginUser,
    logoutUser,
    updateUser,
} from "../controllers/user.controller.js";
import { resendOtp, verifyOtp } from "../controllers/otp.controller.js";
import {
    forgotPassowrd,
    resetPassword,
} from "../controllers/forgotPassword.controller.js";

const userRouter = express.Router();

// Create user
userRouter.post("/signup", upload.single("avatar"), createUser);

// Update user
userRouter.put("/", [authenticateToken, upload.single("avatar")], updateUser);

// Delete user
userRouter.delete("/", authenticateToken, deleteUser);

// Login
userRouter.post("/login", loginUser);

// Logout
userRouter.post("/logout", authenticateToken, logoutUser);

// Find users
userRouter.get("/:username", authenticateToken, findUser);

// Refresh access token
userRouter.post("/refresh-token", refreshAccessToken);

// Verify otp
userRouter.post("/verifyotp", verifyOtp);

// Resend OTP
userRouter.post("/resend-otp", resendOtp);

// Forgot password
userRouter.post("/forgot-password", forgotPassowrd);

// Reset password
userRouter.post("/reset-password", resetPassword);

export default userRouter;
