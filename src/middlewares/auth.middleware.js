import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

export const VerifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const Token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        console.log(Token);
    
        if (!Token) {
            throw new ApiError(401, "Unauthorized")
        }
    
        const jwtToken = jwt.verify(Token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(jwtToken?._id).select("-password -refreshToken")
    
        if (!user) {
            throw new ApiError(401, "Invalid Token") 
        }
    
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, "Token not found or invalid")
    }

})