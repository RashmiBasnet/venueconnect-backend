import { Router } from "express";
import { adminOnlyMiddleware, authorizedMiddleware } from "../../middleware/authorization.middleware";
import { BookingController } from "../../controllers/booking.controller";

const router = Router();
const controller = new BookingController();

router.get("/", authorizedMiddleware, adminOnlyMiddleware, controller.getAllBookings);
router.patch("/:id/status", authorizedMiddleware, adminOnlyMiddleware, controller.updateBookingStatus);
router.patch("/:id/payment-status", authorizedMiddleware, adminOnlyMiddleware, controller.updatePaymentStatus);

export default router;