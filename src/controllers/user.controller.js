import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiReasponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

//access and refresh token generation method
const genAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
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
    throw new ApiError(500, "Error generating tokens");
  }
};

const deleteImageFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
    if (result.result !== "ok") {
      throw new ApiError(500, "Error deleting image from cloudinary");
    }
    return true;
  } catch (error) {
    throw new ApiError(500, "Error deleting image from cloudinary");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //#Registration logic here
  //get user details from frontend
  const { username, fullName, email, password } = req.body;
  //validation - not empty
  if (
    [username, fullName, email, password].some((feild) => feild?.trim() === "")
  ) {
    throw new ApiError(400, "Please fill all the fields");
  }
  if (email.includes("@") === false) {
    throw new ApiError(400, "Please enter a valid email");
  }
  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters long");
  }
  if (username.includes(" ")) {
    throw new ApiError(400, "Username must not contain spaces");
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
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path || null;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Please upload an avatar image");
  }
  //upload images to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  let coverImage;
  if (coverImageLocalPath !== null) {
    coverImage = await uploadOnCloudinary(coverImageLocalPath);
  }
  if (!avatar) {
    throw new ApiError(500, "Error uploading avatar");
  }
  //create user object
  const user = await User.create({
    username: username.toLowerCase(),
    fullName,
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });
  //remove password and refresh token from response
  const userCreated = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  //if user is not created, throw error
  if (!userCreated) {
    throw new ApiError(500, "Error creating user");
  }
  //send response
  return res
    .status(201)
    .json(new ApiReasponse(userCreated, 201, "User created successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req body data
  const { username, email, password } = req.body;
  //validation - username or email not empty
  if (!username && !email) {
    throw new ApiError(400, "Please enter username or email");
  }
  if (!password) {
    throw new ApiError(400, "Please enter password");
  }
  // if(!email){
  //     if(email.includes("@")===false){
  //         throw new ApiError(400,"Please enter a valid email")
  // }}
  //find the user by username or email
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  console.log(user);

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  //check password
  const passwordCorrect = await user.isPasswordCorrect(password);
  if (!passwordCorrect) {
    throw new ApiError(401, "Invalid password");
  }
  //generate access token and refresh token
  const { accessToken, refreshToken } = await genAccessAndRefreshToken(
    user._id
  );
  //remove password and refresh token from response
  const userUpdated = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  //send them to cookies
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiReasponse(
        200,
        {
          user: userUpdated,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
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

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
      throw new ApiError(401, "Please login first");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    if (!decodedToken) {
      throw new ApiError(401, "Invalid refresh token");
    }
    const user = await User.findById(decodedToken?.id);
    if (user === null) {
      throw new ApiError(401, "invalid refresh token");
    }
    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "refresh token is expired or invalid");
    }
    //generate new access token and refresh token
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await genAccessAndRefreshToken(user._id);
    console.log(newAccessToken, newRefreshToken);
    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiReasponse(
          200,
          { newAccessToken, newRefreshToken },
          "Access token"
        )
      );
  } catch (error) {
    return new ApiError(401, "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(401, "User not found");
  }
  const { oldPassword, newPassword } = req.body;
  const currectPassword = await user.isPasswordCorrect(oldPassword);
  if (!currectPassword) {
    throw new ApiError(401, "Invalid password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiReasponse(200, null, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiReasponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  //validation - not empty
  if ([fullName, email].some((feild) => feild?.trim() === "")) {
    throw new ApiError(400, "Please fill all the fields");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(200)
    .json(new ApiReasponse(200, user, "User updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const localAvatarPath = req.file?.path;
  if (!localAvatarPath) {
    throw new ApiError(400, "Please upload an avatar image");
  }
  //upload images to cloudinary
  const avatar = await uploadOnCloudinary(localAvatarPath);
  if (!avatar) {
    throw new ApiError(500, "Error uploading avatar");
  }
  //update user avatar in db
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(200)
    .json(new ApiReasponse(200, user, "User updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const localCoverImagePath = req.file?.path;
  if (!localCoverImagePath) {
    throw new ApiError(400, "Please upload a cover image");
  }
  //upload images to cloudinary
  const coverImage = await uploadOnCloudinary(localCoverImagePath);
  if (!coverImage) {
    throw new ApiError(500, "Error uploading cover image");
  }
  //update user avatar in db
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return res
    .status(200)
    .json(new ApiReasponse(200, user, "User updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Please provide a username");
  }
  const channel = await User.aggregate([
    {
      $match: { username: username?.toLowerCase() },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: { $size: "$subscribers" },
        subscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        subscriberCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);
  if (!channel || channel?.length === 0) {
    throw new ApiError(404, "Channel not found");
  }
  return res
    .status(200)
    .json(new ApiReasponse(200, channel[0], "User channel profile fetched"));
});




export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
};
