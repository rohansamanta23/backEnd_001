import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
    watchHistory: [
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video'
        }
    ],
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique:true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true,'password is required'],
    },
    avatar: {
        type: String, //cloudinary avatar
        required: true
    },
    coverImage: {
        type: String //cloudinary cover image
    },
    refreshToken: {
        type: String
    },

}, {
    timestamps: true
});

userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
}
);
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};
userSchema.methods.generateAccessToken = function () {
    return jwt.sign({ 
        id: this._id,
        username: this.username,
        email: this.email,
        fullName: this.fullName 
    },
    process.env.ACCESS_TOKEN_SECRET, 
    { 
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    });
}
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign({ 
        id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET, 
    { 
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    });
}
export const User = mongoose.model("User", userSchema);