import { Router } from "express";
import { authorizedMiddleware } from "../middleware/authorization.middleware";
import { BookingController } from "../controllers/booking.controller";

const router = Router();
const controller = new BookingController();

router.post("/", authorizedMiddleware, controller.createBooking);

router.get("/me", authorizedMiddleware, controller.getMyBookings);

router.get("/:id", authorizedMiddleware, controller.getMyBookingById);

export default router;