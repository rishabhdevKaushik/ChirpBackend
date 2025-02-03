import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const connect = await mongoose.connect(process.env.MONGODB_URL);

        console.log(`MongoDB connected`);
    } catch (error) {
        console.log(`Error while connecting to MongoDB:\n${error}`);
    }
};

export default connectDB;
