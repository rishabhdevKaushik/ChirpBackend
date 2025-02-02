import { PrismaClient } from "@prisma/client";

// Initialize Prisma client for PostgreSQL
const prismaPostgres = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL, // URL for PostgreSQL (from .env file)
        },
    },
});

export default prismaPostgres;
