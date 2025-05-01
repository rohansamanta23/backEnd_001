import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    subscriber: { // one who subscribes
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    channel: { // channel being subscribed to
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    
},{
    timestamps: true,
})

export const Subscription = mongoose.model("Subscription", subscriptionSchema);