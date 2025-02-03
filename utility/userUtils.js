import prismaPostgres from "../config/prismaPostgres.config.js";

// Get multiple users from username
export const getUsersByUsernames = async (usernames) => {
    try {
        const users = await prismaPostgres.user.findMany({
            where: { username: { in: usernames } },
        });

        if (users.length !== usernames.length) {
            throw new Error("Some users not found.");
        }

        return users; // Returns array of user objects
    } catch (error) {
        console.log("Error fetching users:", error);
    }
};

export const getUserByUsername = async (username) => {
    try {
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            throw new Error("User not found");
        }

        return user;
    } catch (error) {
        console.log(`Error fetching user ${username}:`, error);
    }
};
