import { Router } from "express";
import { VenueController } from "../../controllers/venue.controller";
import { adminOnlyMiddleware, authorizedMiddleware } from "../../middleware/authorization.middleware";
import { uploads } from "../../middleware/upload.middleware";

const router = Router();
const venueController = new VenueController();

router.use(adminOnlyMiddleware);
router.use(authorizedMiddleware);

router.post(
    "/",
    uploads.array("images", 10),
    venueController.createVenue
);

router.put("/:id", venueController.updateVenue);

router.put(
    "/:id/images",
    uploads.array("images", 10),
    venueController.replaceVenueImages
);

export default router;
