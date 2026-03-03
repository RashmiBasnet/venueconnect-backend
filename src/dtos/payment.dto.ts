import { z } from "zod";
import {
    PaymentStatusValues,
    PaymentMethodValues,
} from "../types/payment.type";

const objectId = z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const InitiateKhaltiPaymentDTO = z.object({
    bookingId: objectId,
    amount: z.coerce.number().int().min(1, "Amount must be positive"),
    returnUrl: z.string().url("Return URL must be a valid URL"),
});

export type InitiateKhaltiPaymentDTO = z.infer<
    typeof InitiateKhaltiPaymentDTO
>;

export const VerifyKhaltiPaymentDTO = z.object({
    bookingId: objectId,
    pidx: z.string().min(1, "PIDX is required"),
});

export type VerifyKhaltiPaymentDTO = z.infer<
    typeof VerifyKhaltiPaymentDTO
>;

export const CreatePaymentDTO = z.object({
    userId: objectId,
    bookingId: objectId,

    amount: z.coerce.number().int().min(1),

    status: z.enum(PaymentStatusValues).default("pending"),
    paymentMethod: z.enum(PaymentMethodValues).default("khalti"),

    transactionId: z.string().trim().optional(),
    pidx: z.string().trim().optional(),
    paymentUrl: z.string().url().optional(),

    metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreatePaymentDTO = z.infer<typeof CreatePaymentDTO>;

export const UpdatePaymentDTO = z.object({
    status: z.enum(PaymentStatusValues).optional(),
    transactionId: z.string().trim().optional(),
    pidx: z.string().trim().optional(),
    paymentUrl: z.string().url().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdatePaymentDTO = z.infer<typeof UpdatePaymentDTO>;

export const PaymentResponseDTO = z.object({
    success: z.boolean(),
    message: z.string(),
    payment: z.any().optional(),
    paymentUrl: z.string().url().optional(),
    pidx: z.string().optional(),
});

export type PaymentResponseDTO = z.infer<typeof PaymentResponseDTO>;

export const PaymentFilterDTO = z.object({
    page: z.preprocess((v) => Number(v) || 1, z.number().min(1)),
    size: z.preprocess((v) => Number(v) || 10, z.number().min(1).max(100)),
    status: z.enum(PaymentStatusValues).optional(),
});

export type PaymentFilterDTO = z.infer<typeof PaymentFilterDTO>;

export const KhaltiWebhookDTO = z.object({
    pidx: z.string(),
    status: z.string(),
    amount: z.coerce.number(),
    total_amount: z.coerce.number(),
    transaction_id: z.string().nullable(),
    purchase_order_id: z.string(),
    purchase_order_name: z.string().optional(),
    mobile: z.string().optional(),
});

export type KhaltiWebhookDTO = z.infer<typeof KhaltiWebhookDTO>;