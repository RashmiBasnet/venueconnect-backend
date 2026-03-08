import mongoose, { Document, Schema } from "mongoose";
import { PaymentType } from "../types/payment.type";

const PaymentSchemaM: Schema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },

        amount: { type: Number, required: true, min: 1 },

        status: {
            type: String,
            enum: ["pending", "completed", "failed", "refunded"],
            default: "pending",
            index: true,
        },

        paymentMethod: { type: String, enum: ["khalti"], required: true, index: true },

        transactionId: { type: String, index: true },
        pidx: { type: String, index: true },
        paymentUrl: { type: String },

        metadata: { type: Schema.Types.Mixed },
    },
    { timestamps: true }
);

PaymentSchemaM.index({ bookingId: 1, createdAt: -1 });
PaymentSchemaM.index({ userId: 1, createdAt: -1 });
PaymentSchemaM.index({ status: 1, createdAt: -1 });

export interface IPayment extends Omit<PaymentType, "_id" | "userId" | "bookingId" | "createdAt" | "updatedAt">, Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    bookingId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export const PaymentModel = mongoose.model<IPayment>("Payment", PaymentSchemaM);