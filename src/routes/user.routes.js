import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.js";
import { VerifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)

router.route("/logout").post(VerifyJWT, logoutUser)

router.route("/refreshToken").post(refreshAccessToken)

router.route("/changePass").post(VerifyJWT, changePassword)


export default router;