import mongoose, { Document, Schema } from "mongoose";
import { VenueType } from "../types/venue.type";

const VenueSchema: Schema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, default: "" },

        address: {
            area: { type: String },
            city: { type: String, default: "Kathmandu" },
            country: { type: String, default: "Nepal" },
            zipCode: { type: String },
        },

        images: { type: [String], default: [] },

        pricing: {
            baseType: {
                type: String,
                enum: ["PER_PLATE", "FLAT", "PER_HOUR"],
                required: true,
            },
            basePrice: { type: Number, required: true, min: 0 },
            currency: {
                type: String,
                enum: ["NPR", "USD", "INR"],
                default: "NPR",
            },
        },

        capacity: {
            minGuests: { type: Number, default: 1, min: 1 },
            maxGuests: { type: Number, required: true, min: 1 },
        },

        amenities: { type: [String], default: [] },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export interface IVenue extends VenueType, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export const VenueModel = mongoose.model<IVenue>("Venue", VenueSchema);
