import cloudinary from "../config/cloudinary.config.js";
import removeFile from "../utility/removeFile.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../middlewares/auth.middleware.js";
import jwt from "jsonwebtoken";
import prismaPostgres from "../config/prismaPostgres.config.js";

// Create user
export const createUser = async (req, res) => {
    try {
        const { email, name, username, password, confirmPassword } = req.body;

        const avatarPath = req.file ? req.file.path : null;

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Uploading image
        const uploadResult = avatarPath
            ? await cloudinary.uploader
                  .upload(avatarPath, {
                      folder: "avatars",
                      resource_type: "image",
                  })
                  .catch((error) => {
                      console.log(error);
                  })
            : undefined;

        const user = await prismaPostgres.user.create({
            data: {
                email,
                name,
                username,
                password: hashedPassword,
                avatarUrl: avatarPath ? uploadResult.secure_url : undefined,
            },
        });
        if (avatarPath) {
            removeFile(avatarPath);
        }

        if (user) {
            const token = generateToken(user);
            return res.status(201).json({ user: user, token: token });
        }
    } catch (error) {
        console.log(`Error while creating user\n${error}`);
        res.status(501).json({ status: "User not created" });
    }
};

// Update user
export const updateUser = async (req, res) => {
    try {
        const { password } = req.body;
        const {
            newName,
            newUsername,
            newEmail,
            newPassword,
            confirmNewPassword,
        } = req.body;

        const avatarPath = req.file ? req.file.path : null;
        // console.log(avatarPath);

        // Check if username and password are provided
        if (!password) {
            return res.status(400).json({ message: "Password is required" });
        }

        // Check username and password
        const user = await prismaPostgres.user.findUnique({
            where: { id: req.user.userId },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(404).json({ message: "Wrong password" });
        }

        if (newPassword) {
            if (newPassword !== confirmNewPassword) {
                return res
                    .status(400)
                    .json({ message: "Passwords do not match" });
            }
        }
        const hashedPassword = await bcrypt.hash(
            newPassword ? newPassword : password,
            10
        );

        const newUploadResult = avatarPath
            ? await cloudinary.uploader
                  .upload(avatarPath, {
                      folder: "avatars",
                      resource_type: "image",
                  })
                  .catch((error) => {
                      console.log(error);
                  })
            : undefined;

        const updatedUser = await prismaPostgres.user.update({
            where: {
                id: req.user.userId,
            },
            data: {
                name: newName,
                username: newUsername,
                password: hashedPassword,
                email: newEmail,
                avatarUrl: avatarPath ? newUploadResult.secure_url : undefined,
            },
        });
        if (avatarPath) {
            removeFile(avatarPath);
        }

        if (updatedUser) {
            return res.status(200).json({
                message: "User updated successfully",
                updatedUser,
            });
        }
    } catch (error) {
        console.log(`Error while Updating user\n${error}`);
        res.status(501).json({ status: "User not updated" });
    }
};

// Delete user
export const deleteUser = async (req, res) => {
    try {
        const { password } = req.body;

        // Check username and password
        const user = await prismaPostgres.user.findUnique({
            where: { id: req.user.userId },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(404).json({ message: "Wrong password" });
        }

        // Delete user
        const deletedUser = await prismaPostgres.user.delete({
            where: {
                id: req.user.userId,
            },
        });

        if (deletedUser) {
            return res
                .status(200)
                .json({ status: "User deleted successfully" });
        }
    } catch (error) {
        console.log(`Error while deleting user\n${error}`);
        res.status(501).json({ status: "User not deleted" });
    }
};

// Login
export const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await prismaPostgres.user.findUnique({
            where: { username: username },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(404).json({ message: "Wrong password" });
        }

        // Generate token
        const { accessToken, refreshToken } = generateToken(user);

        // Hash the refresh token for storage
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

        // Store hashed refresh token record
        await prismaPostgres.refreshToken.create({
            data: {
                token: hashedRefreshToken,
                userid: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            },
        });

        // Set the refresh token as an HTTP-only cookie
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Use secure cookies in production
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return res.status(201).json({ accessToken });
    } catch (error) {
        console.log(error);
        res.status(501).json({ status: "Login failed" });
    }
};

// Logout
export const logoutUser = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;

        if (!refreshToken) {
            return res.status(400).json({ message: "No refresh token found" });
        }

        // Clear the cookie
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
        });

        // Remove the refresh token from the database
        await prismaPostgres.refreshToken.deleteMany({
            where: { token: await bcrypt.hash(refreshToken, 10) },
        });

        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.log("Logout error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Find user using username
export const findUser = async (req, res) => {
    try {
        const senderId = req.user.userId; // got this from the authentication token
        const { username } = req.params; // get username from parameters

        // Validate that the username is provided
        if (!username) {
            return res.status(400).json({ message: "Username is required" });
        }

        // Look up the user by username
        const user = await prismaPostgres.user.findUnique({
            where: {
                username: username,
            },
        });

        // If the user doesn't exist
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if the user blocked the sender
        const blockedRelation = await prismaPostgres.friend.findFirst({
            where: {
                senderId: user.id,
                receiverId: senderId,
                status: "BLOCK",
            },
        });

        // If the sender is blocked
        if (blockedRelation) {
            return res.status(400).json({
                message: "You are blocked by this user",
            });
        }

        // Return the user data if everything is fine
        return res.status(200).json({
            user: {
                email: user.email,
                username: user.username,
                name: user.name,
                avatarUrl: user.avatarUrl,
            },
        });
    } catch (error) {
        console.log(`Error while finding user \n${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
};

// refreshTokens
export const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;

        if (!refreshToken) {
            return res
                .status(400)
                .json({ message: "No refresh token provided" });
        }

        // Find the hashed token in the database
        const tokenRecord = await prismaPostgres.refreshToken.findFirst({
            where: { userId: jwt.decode(refreshToken).userid },
        });

        if (!tokenRecord) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        // Validate the refresh token
        try {
            jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY);
        } catch (err) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        // Generate a new access token
        const user = await prismaPostgres.user.findUnique({
            where: { id: tokenRecord.userid },
        });

        const newAccessToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "30m" } // Expires in 30 minutes
        );

        return res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
        console.log("Error refreshing access token:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
