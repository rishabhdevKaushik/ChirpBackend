import jwt from "jsonwebtoken";
import prismaPostgres from "../config/prismaPostgres.config.js";

const JWT_SECRET = process.env.JWT_SECRET_KEY;
const JWT_REFRESH = process.env.JWT_REFRESH_KEY;

export const generateToken = (user) => {
    const accessToken = jwt.sign(
        {
            userId: user.id,
            userName: user.userName,
        },
        JWT_SECRET,
        {
            expiresIn: "30m",
        }
    );
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH, {
        expiresIn: "7d",
    });
    return { accessToken, refreshToken };
};

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    // Bearer Token value
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res
            .status(401)
            .json({ message: "Authentication token required" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({ message: "Invalid token" });
        }
        req.user = user;
        next();
    });
};

// Refresh access token
export const refreshAccessToken = async (req, res) => {
    try {
        // const { refreshToken } = req.cookies;
        const refreshToken = req.body.refreshToken;
        const authHeader = req.headers.authorization || "";

        const accessToken = authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : null;

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
            { userId: user.id },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "30m" } // Access token expiration
        );

        return res.status(200).send({
            message: "Access token refreshed successfully",
            accessToken: newAccessToken,
        });
    } catch (error) {
        console.error("Error refreshing access token:", error);
        return res.status(500).json({ message: "Could not refresh access token. Internal server error" });
    }
};
