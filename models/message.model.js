import mongoose from "mongoose";

const messageModel = mongoose.Schema(
    {
        sender: {
            type: Number, // Store PostgreSQL User ID
        },
        content: {
            type: String,
            trim: true,
        },
        chat: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 86400, // 24 hours in seconds
        },
    },
    {
        timestamps: true,
    }
);

const Message = mongoose.model("Message", messageModel);
export default Message;
