import express from "express";
import upload from "../config/multer.config.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
    createUser,
    deleteUser,
    findUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updateUser,
} from "../controllers/user.controller.js";

const userRouter = express.Router();

// Create user
userRouter.post("/signup", upload.single("avatar"), createUser);

// Update user
userRouter.put("/", [authenticateToken, upload.single("avatar")], updateUser);

// Delete user
userRouter.delete("/", authenticateToken, deleteUser);

// Login
userRouter.post("/login", loginUser);

// Refresh authenticate token
userRouter.post("/refresh-token", refreshAccessToken);

// Logout
userRouter.post("/logout", authenticateToken, logoutUser);

// Find users
userRouter.get("/:username", authenticateToken, findUser);

export default userRouter;
