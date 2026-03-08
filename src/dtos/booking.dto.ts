import z from "zod";
import { BookingSchema } from "../types/booking.type";

export const BookingBaseDto = BookingSchema.pick({
    venueId: true,
    packageId: true,
    eventDate: true,
    startTime: true,
    endTime: true,
    guests: true,
    contactName: true,
    contactPhone: true,
    contactEmail: true,
    note: true,
    extras: true,
});

export const CreateBookingDto = BookingBaseDto.superRefine((data, ctx) => {
    const [sh, sm] = data.startTime.split(":").map(Number);
    const [eh, em] = data.endTime.split(":").map(Number);

    if (eh * 60 + em <= sh * 60 + sm) {
        ctx.addIssue({
            code: "custom",
            message: "endTime must be after startTime",
            path: ["endTime"],
        });
    }
});

export type CreateBookingDto = z.infer<typeof CreateBookingDto>;

export const UpdateBookingDto = BookingBaseDto.partial();
export type UpdateBookingDto = z.infer<typeof UpdateBookingDto>;

export const UpdateBookingStatusDto = z.object({
    status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
});
export type UpdateBookingStatusDto = z.infer<typeof UpdateBookingStatusDto>;

export const UpdatePaymentStatusDto = z.object({
    paymentStatus: z.enum(["unpaid", "paid", "refunded"]),
});
export type UpdatePaymentStatusDto = z.infer<typeof UpdatePaymentStatusDto>;