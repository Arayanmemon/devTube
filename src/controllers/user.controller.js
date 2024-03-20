import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadImg } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {

    // get the data from frontend
    const { userName, email, password, fullName } = req.body;

    // validate the data
    if ([userName, email, password, fullName].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // check if the user already exists
    const existedUser = await User.findOne({ email });

    if (existedUser) {
        throw new ApiError(409, "User already exists");
    }

    // upload the images on multer
    const avatarPath = req.files?.avatar[0]?.path;
    // const coverPath = req.files?.coverImg[0].path;

    let coverPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverPath = req.files.coverImage[0].path;
    }

    if (!avatarPath) {
        throw new ApiError(400, "Avatar is required");
    }

    // upload the images on cloudinary
    const avatar = await uploadImg(avatarPath);
    const cover = await uploadImg(coverPath);
    console.log(avatar);

    // create the user
    const user = await User.create({
        userName,
        email,
        password,
        fullName,
        avatar: avatar.url,
        coverImage: cover?.url || ""
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    console.log(createdUser);


    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    res.status(201).json({
        message: "User registered successfully",
        user: createdUser
    })
})


const loginUser = asyncHandler(async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }
    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPassCorrect = await user.isPasswordCorrect(password);

    if (!isPassCorrect) {
        throw new ApiError(401, "Wrong password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json({
            message: "User logged in successfully",
            user: loggedInUser, accessToken, refreshToken
        })

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true,
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    res.clearCookie("refreshToken")
    res.clearCookie("accessToken")
    res.status(200).json({
        message: "User logged out successfully"
    })
})

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating the tokens");
    }
}

const refreshAccessToken = asyncHandler(async (req, res) => {
    const expiredToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!expiredToken) {
        throw new ApiError(400, "unauthorized request");
    }

    const decodedToken = jwt.verify(expiredToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(expiredToken?._id);

    if (!user) {
        throw new ApiError(404, "invalid token");
    }


    if (expiredToken !== user?.refreshToken) {
        throw new ApiError(400, "Refresh Token is expired or invalid");
    }

    const options = {
        httpOnly: true,
        secure: true
    }

    const { accessToken, newrefreshToken } = await generateAccessAndRefreshToken(user._id);

    return res.status(200)
        .cookie("refreshToken", newrefreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json({
            message: "Token refreshed successfully",
            user: accessToken, newrefreshToken
        })
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200)
        .json({
            message: "Current User fetched Successfully",
            user: req?.user,
        })
})

const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    // check if anyone of them is empty
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "New and Old Password cannot be empty")
    }


    // check if old password is correct
    const user = await User.findById(req.user?._id);
    const isPassCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPassCorrect) {
        throw new ApiError(400, "Old password is incorrect")
    }

    // check if both are same
    if (oldPassword === newPassword) {
        throw new ApiError(400, "New and Old passwords cannot be same")
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200)
        .json({
            message: "Password changed Successfully",
        })
})

const updateUserCredentials = asyncHandler(async (req, res) => {
    const { email, fullName } = req.body

    if (!email || !fullName) {
        throw new ApiError(400, "credentials cannot be empty")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200)
        .json({
            message: "Account details updated successfully",
            user: user
        })
})

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocal = req.file?.path;

    if (!avatarLocal) {
        throw new ApiError(400, "Avatar is missing")
    }

    const avatar = await uploadImg(avatarLocal);

    if (!avatar.url) {
        throw new ApiError(400, "Some error occured while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200)
        .json({
            message: "Avatar Uploaded Successfully",
            user,
        })
})

const updateCover = asyncHandler(async (req, res) => {
    const coverLocal = req.file?.path;

    if (!coverLocal) {
        throw new ApiError(400, "Cover Image is missing")
    }

    const cover = await uploadImg(coverLocal);

    if (!cover.url) {
        throw new ApiError(400, "Some error occured while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: cover.url
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200)
        .json({
            message: "Avatar Uploaded Successfully",
            user,
        })
})

const getChannelInfo = asyncHandler(async (req, res) => {
    const { username } = req?.params;

    if (!username?.trim()) {
        throw new ApiError(400, "wrong url or path");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subcriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subcriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribed"
            }
        },
        {
            $addFields: {
                Subscribers: {
                    $size: "$subscribers"
                },
                SubscribedTo: {
                    $size: "$subscribed"
                },
                isSubscribed: {
                    $cond: {
                        $if: { $in: [req.user?._id, "$subscribers.channel"] },
                        $then: true,
                        $else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                avatar: 1,
                coverImage: 1,
                Subscribers: 1,
                SubscribedTo: 1,
                isSubscribed: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(400, "channel doesn't exist")
    }

    return res.status(200)
        .json({
            message: "channel fetched successfully",
            channel: channel[0],
        })

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changePassword,
    updateAvatar,
    updateCover
}