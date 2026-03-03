import {
    PaymentRepository,
    IPaymentRepository,
} from "../repositories/payment.repository";

import {
    BookingRepository,
    IBookingRepository,
} from "../repositories/booking.repository";

import { UserRepository, IUserRepository } from "../repositories/user.repository";

import { CreatePaymentDTO, UpdatePaymentDTO } from "../dtos/payment.dto";
import { initiateKhaltiPayment, verifyKhaltiPayment } from "../config/khalti";
import { HttpError } from "../errors/http-error";
import mongoose from "mongoose";

export class PaymentService {
    private paymentRepository: IPaymentRepository;
    private userRepository: IUserRepository;
    private bookingRepository: IBookingRepository;

    constructor() {
        this.paymentRepository = new PaymentRepository();
        this.userRepository = new UserRepository();
        this.bookingRepository = new BookingRepository();
    }

    private sanitizePayment(payment: any) {
        const paymentObj = payment?.toObject ? payment.toObject() : payment;
        if (!paymentObj) return paymentObj;
        const { __v, ...safePayment } = paymentObj;
        return safePayment;
    }

    public getSanitizedPayment(payment: any) {
        return this.sanitizePayment(payment);
    }


    // Initiate Khalti payment for a booking
    initiateKhaltiPayment = async (
        userId: string,
        bookingId: string,
        amount: number,
        returnUrl: string
    ) => {
        const user = await this.userRepository.getUserById(userId);
        if (!user) throw new HttpError(404, "User not found");

        const booking = await this.bookingRepository.getBookingById(bookingId);
        if (!booking) throw new HttpError(404, "Booking not found");

        const bookingOwnerId =
            typeof booking.bookedBy === "object" && booking.bookedBy
                ? String((booking.bookedBy as any)._id ?? "")
                : String(booking.bookedBy);

        if (bookingOwnerId !== String(userId)) {
            throw new HttpError(403, "You are not allowed to pay for this booking");
        }
        if (booking.paymentStatus === "paid") {
            throw new HttpError(400, "Booking has already been paid");
        }

        const existingPayment =
            await this.paymentRepository.getPaymentByBookingId(bookingId);

        if (existingPayment) {
            if (existingPayment.status === "completed") {
                throw new HttpError(400, "Booking has already been paid");
            }

            return {
                payment: this.sanitizePayment(existingPayment),
                paymentUrl: existingPayment.paymentUrl,
                pidx: existingPayment.pidx,
            };
        }

        // Khalti customer info
        const customerInfo = {
            name: user.fullName,
            email: user.email,
        };

        // Initiate with Khalti
        const paymentData = await initiateKhaltiPayment({
            return_url: returnUrl,
            website_url: process.env.CLIENT_URL || "http://localhost:3000",
            amount: amount,
            purchase_order_id: bookingId,
            purchase_order_name: `Booking ${bookingId}`,
            customer_info: customerInfo,
        });

        const createPaymentData: CreatePaymentDTO = {
            userId,
            bookingId,
            amount,
            status: "pending",
            paymentMethod: "khalti",
            pidx: paymentData.pidx,
            paymentUrl: paymentData.payment_url,
            metadata: paymentData,
        };

        const payment =
            await this.paymentRepository.createPayment(createPaymentData);

        return {
            payment: this.sanitizePayment(payment),
            paymentUrl: paymentData.payment_url,
            pidx: paymentData.pidx,
        };
    };

    verifyKhaltiPayment = async (pidx: string, bookingId: string) => {
        const payment = await this.paymentRepository.getPaymentByPidx(pidx);
        if (!payment) throw new HttpError(404, "Payment record not found");

        if (payment.bookingId.toString() !== bookingId) {
            throw new HttpError(400, "Booking ID mismatch");
        }

        const verificationData = await verifyKhaltiPayment(pidx);

        if (verificationData.status === "Completed") {
            const updatedPayment = await this.paymentRepository.updatePayment(
                payment._id.toString(),
                {
                    status: "completed",
                    transactionId: verificationData.transaction_id ?? undefined,
                    metadata: verificationData,
                } as any
            );

            await this.bookingRepository.updateOneBooking(
                bookingId,
                { paymentStatus: "paid" } as any
            );

            return {
                success: true,
                message: "Payment verified successfully",
                payment: this.sanitizePayment(updatedPayment),
            };
        }
        await this.paymentRepository.updatePayment(payment._id.toString(), {
            status: "failed",
            metadata: verificationData,
        } as any);

        throw new HttpError(400, `Payment status: ${verificationData.status}`);
    };

    getPaymentByBookingId = async (bookingId: string) => {
        const payment = await this.paymentRepository.getPaymentByBookingId(bookingId);
        if (!payment) throw new HttpError(404, "Payment not found");
        return this.sanitizePayment(payment);
    };

    getUserPayments = async (
        userId: string,
        page: number = 1,
        size: number = 10,
        status?: any
    ) => {
        const skip = (page - 1) * size;
        const payments = await this.paymentRepository.getPaymentsByUser(
            userId,
            skip,
            size,
            status
        );
        return payments.map((p) => this.sanitizePayment(p));
    };

    getAllPayments = async (
        page: number = 1,
        size: number = 10,
        status?: any
    ) => {
        const skip = (page - 1) * size;
        const payments = await this.paymentRepository.getAllPayments(
            skip,
            size,
            status
        );
        return payments.map((p) => this.sanitizePayment(p));
    };
}