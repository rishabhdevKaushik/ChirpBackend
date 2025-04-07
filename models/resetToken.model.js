import mongoose from "mongoose";

const resetTokenSchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    token: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// TTL index: this will automatically delete the resetToken document 1 hour (3600 seconds) after creation
resetTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

const ResetToken = mongoose.model("ResetToken", resetTokenSchema);
export default ResetToken;
