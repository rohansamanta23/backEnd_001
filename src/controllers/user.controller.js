import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiReasponse } from "../utils/ApiResponse.js";

//access and refresh token generation method
const genAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        //save refresh token in db
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500,"Error generating tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //#Registration logic here
    //get user details from frontend
    const {username,fullName,email,password}=req.body
    //validation - not empty
    if(
        [username,fullName,email,password].some((feild)=>feild?.trim()==="")
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
    //check for images (avatar, coverImage)
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path||null;
    
    if(!avatarLocalPath){
        throw new ApiError(400,"Please upload an avatar image")
    }
    //upload images to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    let coverImage;
    if(coverImageLocalPath!==null){
        coverImage = await uploadOnCloudinary(coverImageLocalPath)
    }
    if(!avatar){
        throw new ApiError(500,"Error uploading avatar")
    }
    //create user object
    const user = await User.create({
        username:username.toLowerCase(),
        fullName,
        email,
        password,
        avatar:avatar.url,
        coverImage:coverImage?.url||"",
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

const loginUser = asyncHandler(async (req, res) => {
    //req body data
    const {username,email,password} = req.body
    //validation - username or email not empty
    if(!username && !email){
        throw new ApiError(400,"Please enter username or email")
    }
    if(!password){
        throw new ApiError(400,"Please enter password")
    }
    // if(!email){
    //     if(email.includes("@")===false){
    //         throw new ApiError(400,"Please enter a valid email")
    // }}
    //find the user by username or email
    const user = await User.findOne({
        $or: [{username},{email}]
    })
    console.log(user);
    
    if(!user){
        throw new ApiError(404,"User not found")
    }
    //check password
    const passwordCorrect = await user.isPasswordCorrect(password)
    if(!passwordCorrect){
        throw new ApiError(401,"Invalid password")
    }
    //generate access token and refresh token
    const {accessToken,refreshToken} = await genAccessAndRefreshToken(user._id);
    //remove password and refresh token from response
    const userUpdated = await User.findById(user._id).select("-password -refreshToken")
    //send them to cookies
    const options = {
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiReasponse(200,{
        user:userUpdated,
        accessToken,
        refreshToken
    },"User logged in successfully"))
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        refreshToken: undefined,
    });
    const options = {
        httpOnly: true,
        secure: true,
    };
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiReasponse(200, null, "User logged out successfully"));
});


export { registerUser, loginUser, logoutUser };