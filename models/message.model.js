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
    },
    {
        timestamps: true,
    }
);

const Message = mongoose.model("Message", messageModel);
export default Message;
