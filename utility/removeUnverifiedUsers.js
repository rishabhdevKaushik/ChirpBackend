import cron from "node-cron";
import prismaPostgres from "../config/prismaPostgres.config.js";

// Schedule a cron job to run every day at midnight
cron.schedule("0 0 * * *", async () => {
    // Calculate the threshold date (24 hours ago)
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        const result = await prismaPostgres.user.deleteMany({
            where: {
                isVerified: false,
                createdAt: {
                    lt: threshold,
                },
            },
        });
        console.log(
            `Deleted ${result.count} unverified user(s) older than 24 hours.`
        );
    } catch (error) {
        console.error("Error during cleanup job:", error);
    }
});
