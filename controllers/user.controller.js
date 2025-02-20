import cloudinary from "../config/cloudinary.config.js";
import removeFile from "../utility/removeFile.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../middlewares/auth.middleware.js";
import jwt from "jsonwebtoken";
import prismaPostgres from "../config/prismaPostgres.config.js";
import { generateAndSendOtp } from "../utility/otpService.js";

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
                      console.log(`Error while uploading avatar: ${error}`);
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

        // Generate and send OTP
        await generateAndSendOtp(user.id, email); // Pass user id and email

        // Set cookie with the user ID for OTP verification (expires in 15 minutes)
        res.cookie("tempUserId", user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV == "production", // use secure cookies in production
            sameSite: "None",
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        // Respond with a message to verify OTP; do not generate token yet.
        res.status(201).json({
            message: "User created. Please verify the OTP sent to your email.",
        });
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
                      console.log(`Error while uploading avatar: ${error}`);
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
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res
                .status(400)
                .json({ message: "identifier or password is missing" });
        }

        const user = await prismaPostgres.user.findFirst({
            where: { OR: [{ username: identifier }, { email: identifier }] },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(404).json({ message: "Wrong password" });
        }

        // Convert isVerified to boolean explicitly
        const isUserVerified = Boolean(user.isVerified);

        if (!isUserVerified) {
            await generateAndSendOtp(user.id, user.email);

            // Set an HTTP-only cookie with the user ID for OTP verification (expires in 15 minutes)
            res.cookie("tempUserId", user.id, {
                httpOnly: true,
                secure: process.env.NODE_ENV == "production", // use secure cookies in production
                sameSite: "None",
                maxAge: 15 * 60 * 1000, // 15 minutes
            });

            return res.status(409).send({
                message:
                    "User not verified. Otp is sent to email, verify first",
            });
        }

        // Generate token
        const token = generateToken(user);

        // Hash the refresh token for storage
        const hashedRefreshToken = await bcrypt.hash(token.refreshToken, 10);

        // Store hashed refresh token record
        await prismaPostgres.refreshToken.create({
            data: {
                token: hashedRefreshToken,
                userid: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            },
        });

        const currentUser = await prismaPostgres.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                avatarUrl: true,
            },
        });

        return res.status(201).json({ token, currentUser });
    } catch (error) {
        console.log(`Error while logging in: ${error}`);
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

        // Gets all tokens for current user
        const existingTokens = await prismaPostgres.refreshToken.findMany({
            where: { userid: req.user.userId },
        });

        if (!existingTokens || existingTokens.length === 0) {
            return res
                .status(400)
                .json({ message: "Could not get refresh token from database" });
        }

        // Compare provided token with each hashed token in the database
        const matchingToken = existingTokens.find((tokenEntry) =>
            bcrypt.compareSync(refreshToken, tokenEntry.token)
        );

        if (!matchingToken) {
            return res.status(400).json({ message: "Invalid refresh token" });
        }

        // Update isRevoked to true
        await prismaPostgres.refreshToken.update({
            where: { id: matchingToken.id }, // Use ID to update the correct record
            data: { isRevoked: true },
        });

        // Clear the cookie
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV == "production",
            sameSite: "Strict",
        });

        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.log(`Error while Logging out: ${error}`);
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

// Check authentication token validity
export const authAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        const authHeader = req.headers.authorization || "";

        const accessToken = authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : null;
        if (!accessToken) {
            return res
                .status(401)
                .json({ message: "Authentication token required" });
        }

        //Check if access token is still valid
        if (accessToken) {
            try {
                jwt.verify(accessToken, process.env.JWT_SECRET_KEY);
                return res
                    .status(200)
                    .json({ message: "Access token is still valid" });
            } catch (error) {
                // Access token is invalid or expired, proceed to refresh token
            }
        }

        // Refresh token validation
        if (!refreshToken) {
            return res
                .status(400)
                .json({ message: "No refresh token provided" });
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY);
        } catch (err) {
            return res
                .status(403)
                .json({ message: "Refresh token expired or invalid" });
        }

        // Find refresh token in DB
        const tokenRecord = await prismaPostgres.refreshToken.findFirst({
            where: {
                userid: decoded.userId,
                isRevoked: false, // Ensure token is not revoked
            },
        });

        if (!tokenRecord) {
            return res
                .status(403)
                .json({ message: "Invalid refresh token, Log in again" });
        }

        // Generate a new access token
        const user = await prismaPostgres.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const newAccessToken = jwt.sign(
            { userid: user.id },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "30m" } // Access token expiration
        );

        return res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
        console.error("Error refreshing access token:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
