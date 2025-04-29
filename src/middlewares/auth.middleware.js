import {asyncHandler} from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import jwt from 'jsonwebtoken';
import {User} from '../models/user.model.js';

const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return new ApiError(401, 'Unauthorized access');
        }
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded.id).select('-password -refreshToken');
        if (!user) {
            return new ApiError(401, 'Unauthorized access');
        }
        req.user = user;
        next();
    } catch (error) {
        return new ApiError(401, 'Unauthorized access');
    }
});

export { verifyJWT };
