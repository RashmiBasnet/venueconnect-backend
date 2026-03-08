import { Router } from "express";
import { adminOnlyMiddleware, authorizedMiddleware } from "../../middleware/authorization.middleware";
import { uploads } from "../../middleware/upload.middleware";
import { PackageController } from "../../controllers/package.controller";

const router = Router();
const controller = new PackageController();

router.post("/", authorizedMiddleware, adminOnlyMiddleware, uploads.array("images", 10), controller.createPackage);

router.put("/:id", authorizedMiddleware, adminOnlyMiddleware, controller.updatePackage);

router.put("/:id/images", authorizedMiddleware, adminOnlyMiddleware, uploads.array("images", 10), controller.replacePackageImages);

router.delete("/:id", authorizedMiddleware, adminOnlyMiddleware, controller.deletePackage);

export default router;
