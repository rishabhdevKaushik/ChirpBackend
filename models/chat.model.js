import mongoose from "mongoose";

const chatModel = mongoose.Schema(
    {
        chatName: {
            type: String,
            trim: true,
        },
        isGroup: {
            type: Boolean,
            default: false,
        },
        users: [
            {
                type: Number, // Store PostgreSQL User IDs as strings
            },
        ],
        latestMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        },
        groupAdmin: {
            type: Number, // Store PostgreSQL User IDs as strings
        },
    },
    {
        timestamps: true,
    }
);

const Chat = mongoose.model("Chat", chatModel);
export default Chat;
