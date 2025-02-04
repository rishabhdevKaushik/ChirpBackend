import prismaPostgres from "../config/prismaPostgres.config.js";

async function cleanExpiredTokens() {
    const now = new Date();

    await prismaPostgres.refreshToken.deleteMany({
        where: {
            OR: [{ isRevoked: true }, { expiresAt: { lt: now } }],
        },
    });

    console.log("Expired and revoked refresh tokens cleaned up.");
}

// Run cleanup every hour
setInterval(cleanExpiredTokens, 60 * 60 * 1000);

export default cleanExpiredTokens;
