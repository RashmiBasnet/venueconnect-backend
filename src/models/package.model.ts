import mongoose, { Document, Schema } from "mongoose";
import { PackageType } from "../types/package.type";

const PackageSchema: Schema = new Schema(
    {
        venueId: { type: Schema.Types.ObjectId, ref: "Venue", required: true },

        name: { type: String, required: true, minlength: 3 },
        description: { type: String },

        images: { type: [String], default: [] },

        pricePerPlate: { type: Number, required: true, min: 0 },

        capacity: {
            minGuests: { type: Number, default: 1 },
            maxGuests: { type: Number },
        },

        inclusions: { type: [String], default: [] },

        addOns: [
            {
                title: { type: String, required: true },
                price: { type: Number, default: 0, min: 0 },
            },
        ],

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

PackageSchema.index({ venueId: 1, isActive: 1 });

export interface IPackage extends Omit<PackageType, "venueId">, Document {
    _id: mongoose.Types.ObjectId;
    venueId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export const PackageModel = mongoose.model<IPackage>("Package", PackageSchema);
