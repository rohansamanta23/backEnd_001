import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
} from "../controllers/user.controller.js";
import {
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(upload.none(), loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh").post(refreshAccessToken);

router
  .route("/change-password")
  .post(verifyJWT, upload.none(), changeCurrentPassword);

router.route("/me").get(verifyJWT, getCurrentUser);

router.route("/update").put(verifyJWT, upload.none(), updateAccountDetails);  

router
  .route("/update-avatar")
  .put(verifyJWT, upload.single("avatar"), updateUserAvatar);

router
  .route("/update-cover-image")
  .put(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

export default router;
