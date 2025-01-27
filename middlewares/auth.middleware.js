import jwt from "jsonwebtoken";

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
        return res.status(401).json({ message: "Authentication token required" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid token" });
        }
        req.user = user;
        next();
    });
};
