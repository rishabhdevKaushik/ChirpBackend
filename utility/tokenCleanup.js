import cron from "node-cron";
import prismaPostgres from "../config/prismaPostgres.config.js";

// Schedule cleanup every hour (at minute 0)
cron.schedule("0 * * * *", async () => {
    const now = new Date();

    try {
        const result = await prismaPostgres.refreshToken.deleteMany({
            where: {
                OR: [{ isRevoked: true }, { expiresAt: { lt: now } }],
            },
        });
        console.log(
            `Expired and revoked refresh tokens cleaned up. Deleted ${result.count} token(s).`
        );
    } catch (error) {
        console.error("Error during token cleanup:", error);
    }
});
