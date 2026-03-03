import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { authorizedMiddleware } from "../middleware/authorization.middleware";

const router = Router();
const paymentController = new PaymentController();

router.post(
    "/khalti/initiate",
    authorizedMiddleware,
    paymentController.initiateKhaltiPayment,
);
router.post("/khalti/verify", authorizedMiddleware, paymentController.verifyKhaltiPayment);
router.get("/user", authorizedMiddleware, paymentController.getUserPayments);
router.get("/booking/:bookingId", authorizedMiddleware, paymentController.getPaymentByBookingId);

router.post("/khalti/webhook", paymentController.khaltiWebhook);

export default router;