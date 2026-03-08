import { Router } from "express";
import { PaymentController } from "../../controllers/payment.controller";
import { authorizedMiddleware, adminOnlyMiddleware } from "../../middleware/authorization.middleware";

const router = Router();
const paymentController = new PaymentController();

router.get(
    "/all",
    authorizedMiddleware,
    adminOnlyMiddleware,
    paymentController.getAllPayments,
);

export default router;