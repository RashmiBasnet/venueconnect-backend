import { PaymentModel, IPayment } from "../models/payment.model";
import { CreatePaymentDTO } from "../dtos/payment.dto";

export interface IPaymentRepository {
    createPayment(payment: CreatePaymentDTO): Promise<IPayment>;
    getPaymentById(paymentId: string): Promise<IPayment | null>;
    getPaymentByPidx(pidx: string): Promise<IPayment | null>;
    getPaymentByBookingId(bookingId: string): Promise<IPayment | null>;
    getPaymentsByUser(
        userId: string,
        skip?: number,
        limit?: number,
        status?: IPayment["status"],
    ): Promise<IPayment[]>;
    getAllPayments(
        skip?: number,
        limit?: number,
        status?: IPayment["status"],
    ): Promise<IPayment[]>;
    updatePayment(
        paymentId: string,
        data: Partial<IPayment>,
    ): Promise<IPayment | null>;
}

export class PaymentRepository implements IPaymentRepository {
    async createPayment(payment: CreatePaymentDTO): Promise<IPayment> {
        const newPayment = new PaymentModel(payment);
        return await newPayment.save();
    }

    async getPaymentById(paymentId: string): Promise<IPayment | null> {
        return await PaymentModel.findById(paymentId).exec();
    }

    async getPaymentByPidx(pidx: string): Promise<IPayment | null> {
        return await PaymentModel.findOne({ pidx }).exec();
    }

    async getPaymentByBookingId(bookingId: string): Promise<IPayment | null> {
        return await PaymentModel.findOne({ bookingId }).exec();
    }

    async getPaymentsByUser(
        userId: string,
        skip: number = 0,
        limit: number = 10,
        status?: IPayment["status"],
    ): Promise<IPayment[]> {
        const query: any = { userId };
        if (status) query.status = status;

        return await PaymentModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();
    }

    async getAllPayments(
        skip: number = 0,
        limit: number = 10,
        status?: IPayment["status"],
    ): Promise<IPayment[]> {
        const query: any = {};
        if (status) query.status = status;

        return await PaymentModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();
    }

    async updatePayment(
        paymentId: string,
        data: Partial<IPayment>,
    ): Promise<IPayment | null> {
        return await PaymentModel.findByIdAndUpdate(
            paymentId,
            { $set: data },
            { new: true },
        ).exec();
    }
}