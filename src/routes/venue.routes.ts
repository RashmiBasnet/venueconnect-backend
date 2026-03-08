import { Router } from "express";
import { VenueController } from "../controllers/venue.controller";

const router = Router();
const venueController = new VenueController();

router.get("/", venueController.getAllVenues);
router.get("/:id", venueController.getVenueById);

export default router;
