import { PrismaClient } from "@prisma/client";

// Initialize Prisma client for MongoDB
const prismaMongo = new PrismaClient({
    datasources: {
        db: {
            url: process.env.MONGODB_URL, // URL for MongoDB (from .env file)
        },
    },
});

export default prismaMongo;
