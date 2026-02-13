import { UserController } from "../controllers/user.controller";
import { Router } from "express";
import { authorizedMiddleware } from "../middleware/authorization.middleware";
import { uploads } from "../middleware/upload.middleware";

const router = Router();
let userController = new UserController();

router.get("/profile", authorizedMiddleware, userController.getProfile);
router.put("/update-profile", authorizedMiddleware, uploads.single("profile"), userController.updateProfile);
router.put("/profile/upload", authorizedMiddleware, uploads.single("profile"), userController.uploadProfilePicture);

router.post("/request-password-reset", userController.sendResetPasswordEmail);
router.post("/reset-password/:token", userController.resetPassword);

export default router;