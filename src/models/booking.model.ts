import mongoose, { Document, Schema } from "mongoose";
import { BookingType } from "../types/booking.type";

const BookingSchemaM: Schema = new Schema(
    {
        venueId: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
        packageId: { type: Schema.Types.ObjectId, ref: "Package", default: null },
        bookedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

        eventDate: { type: Date, required: true },
        startTime: { type: String, required: true }, // HH:mm
        endTime: { type: String, required: true },   // HH:mm

        guests: { type: Number, required: true, min: 1 },

        pricePerPlate: { type: Number, required: true, min: 0 },
        totalPrice: { type: Number, required: true, min: 0 },

        status: {
            type: String,
            enum: ["pending", "confirmed", "cancelled", "completed"],
            default: "pending",
            index: true,
        },

        paymentStatus: {
            type: String,
            enum: ["unpaid", "paid", "refunded"],
            default: "unpaid",
            index: true,
        },

        contactName: { type: String, required: true },
        contactPhone: { type: String, required: true },
        contactEmail: { type: String },

        note: { type: String },
        extras: { type: [String], default: [] },
    },
    { timestamps: true }
);

// indexes
BookingSchemaM.index({ venueId: 1, eventDate: 1, status: 1 });
BookingSchemaM.index({ bookedBy: 1, createdAt: -1 });

export interface IBooking extends Omit<BookingType, "venueId" | "packageId" | "bookedBy" | "eventDate">, Document {
    _id: mongoose.Types.ObjectId;
    venueId: mongoose.Types.ObjectId;
    packageId?: mongoose.Types.ObjectId | null;
    bookedBy: mongoose.Types.ObjectId;
    eventDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

export const BookingModel = mongoose.model<IBooking>("Booking", BookingSchemaM);