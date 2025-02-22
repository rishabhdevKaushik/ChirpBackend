import cron from "node-cron";
import prismaPostgres from "../config/prismaPostgres.config.js";

async function cleanupTokens() {
    const now = new Date();

    try {
        const result = await prismaPostgres.refreshToken.deleteMany({
            where: {
                OR: [{ isRevoked: true }, { expiresAt: { lt: now } }],
            },
        });
        console.log(
            `Deleted ${result.count} expired and revoked refresh token(s).`
        );
    } catch (error) {
        console.error("Error during token cleanup:", error);
    }
}

// Run immediately when server starts
cleanupTokens();

// Schedule to run every hour
cron.schedule("0 * * * *", cleanupTokens);
