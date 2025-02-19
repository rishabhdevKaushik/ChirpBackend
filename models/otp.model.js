import mongoose from "mongoose";

const otpSchema = mongoose.Schema({
    userId: {
        type: Number,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    numberOfAttempts: {
        type: Number,
        default: 0,
    },
    isUsed: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// TTL index: this will automatically delete the OTP document 15 minutes (900 seconds) after creation
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

const OTP = mongoose.model("OTP", otpSchema);
export default OTP;
