import { z } from "zod";

const objectId = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const PaymentStatusValues = ["pending", "completed", "failed"] as const;
export const PaymentMethodValues = ["khalti"] as const;

export const PaymentSchema = z.object({
    _id: objectId.optional(),

    userId: objectId,
    bookingId: objectId,

    amount: z.coerce.number().int().min(1),

    status: z.enum(PaymentStatusValues),
    paymentMethod: z.enum(PaymentMethodValues),

    transactionId: z.string().trim().optional(),
    pidx: z.string().trim().optional(),
    paymentUrl: z.string().trim().optional(),

    metadata: z.record(z.string(), z.unknown()).optional(),

    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
});

export type PaymentType = z.infer<typeof PaymentSchema>;