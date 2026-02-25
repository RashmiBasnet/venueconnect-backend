import z from "zod";

const objectId = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const BookingSchema = z.object({
    venueId: objectId,
    packageId: objectId.optional().nullable(),
    bookedBy: objectId,

    eventDate: z
        .string()
        .trim()
        .min(1)
        .refine((v) => !Number.isNaN(new Date(v).getTime()), "Invalid eventDate"),

    startTime: z
        .string()
        .trim()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid startTime (HH:mm)"),
    endTime: z
        .string()
        .trim()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid endTime (HH:mm)"),

    guests: z.coerce.number().int().min(1),

    // pricing snapshot (server fills)
    pricePerPlate: z.coerce.number().min(0),
    totalPrice: z.coerce.number().min(0),

    status: z.enum(["pending", "confirmed", "cancelled", "completed"]).default("pending"),
    paymentStatus: z.enum(["unpaid", "paid", "refunded"]).default("unpaid"),

    contactName: z.string().trim().min(1),
    contactPhone: z.string().trim().min(6),
    contactEmail: z.string().trim().email().optional(),

    note: z.string().trim().max(1000).optional(),

    extras: z
        .union([z.array(z.string()), z.string()])
        .optional()
        .transform((val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val.map((x) => x.trim()).filter(Boolean);
            return val.split(",").map((x) => x.trim()).filter(Boolean);
        }),
});

export type BookingType = z.infer<typeof BookingSchema>;