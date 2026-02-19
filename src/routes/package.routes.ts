import { Router } from "express";
import { PackageController } from "../controllers/package.controller";

const router = Router();
const controller = new PackageController();

router.get("/venue/:venueId", controller.getPackagesByVenue);
router.get("/:id", controller.getPackageById);

export default router;
