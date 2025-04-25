import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiReasponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    //#Registration logic here
    //get user details from frontend
    const {username,fullName,email,password}=req.body
    //validation - not empty
    if(
        [username,fullName,email,password].map((feild)=>feild?.trim()==="")
    ){
        throw new ApiError(400,"Please fill all the fields")
    }
    if(email.includes("@")===false){
        throw new ApiError(400,"Please enter a valid email")
    }
    if(password.length<6){
        throw new ApiError(400,"Password must be at least 6 characters long")
    }
    if(username.includes(" ")){
        throw new ApiError(400,"Username must not contain spaces")
    }
    // check if user already logged in (username, email)
    const existingUser = await User.findOne({
        $or: [{ username }, { email }],
    });
    if (existingUser) {
        throw new ApiError(409, "User already exists with this username or email");
    }
    //check for images (avatar, coverpage)
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverpage[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,"Please upload an avatar image")
    }
    //upload images to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverpage = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(500,"Error uploading avatar")
    }
    //create user object
    const user = User.create({
        username:username.toLowerCase(),
        fullName,
        email,
        password,
        avatar:avatar.url,
        coverpage:coverpage?.url||"",
    });
    //remove password and refresh token from response
    const userCreated = await User.findById(user._id).select("-password -refreshToken")
    //if user is not created, throw error
    if(!userCreated){
        throw new ApiError(500,"Error creating user")
    }
    //send response
    return res.status(201).json(new ApiReasponse(userCreated,201,"User created successfully"));
});  

export { registerUser };