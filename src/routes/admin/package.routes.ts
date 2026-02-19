import { Router } from "express";
import { authorizedMiddleware } from "../../middleware/authorization.middleware";
import { uploads } from "../../middleware/upload.middleware";
import { PackageController } from "../../controllers/package.controller";

const router = Router();
const controller = new PackageController();

router.get("/", authorizedMiddleware, controller.getAllPackages);

router.post("/", authorizedMiddleware, uploads.array("images", 10), controller.createPackage);

router.put("/:id", authorizedMiddleware, controller.updatePackage);

router.put("/:id/images", authorizedMiddleware, uploads.array("images", 10), controller.replacePackageImages);

router.delete("/:id", authorizedMiddleware, controller.deletePackage);

export default router;
