const mockPaymentRepository = {
    createPayment: jest.fn(),
    getPaymentByPidx: jest.fn(),
    getPaymentByBookingId: jest.fn(),
    getPaymentsByUser: jest.fn(),
    getAllPayments: jest.fn(),
    updatePayment: jest.fn(),
};

const mockBookingRepository = {
    getBookingById: jest.fn(),
    updateOneBooking: jest.fn(),
};

const mockUserRepository = {
    getUserById: jest.fn(),
};

const mockInitiateKhaltiPayment = jest.fn();
const mockVerifyKhaltiPayment = jest.fn();

jest.mock("../../repositories/payment.repository", () => {
    return {
        PaymentRepository: jest.fn().mockImplementation(() => mockPaymentRepository),
    };
});

jest.mock("../../repositories/booking.repository", () => {
    return {
        BookingRepository: jest.fn().mockImplementation(() => mockBookingRepository),
    };
});

jest.mock("../../repositories/user.repository", () => {
    return {
        UserRepository: jest.fn().mockImplementation(() => mockUserRepository),
    };
});

jest.mock("../../config/khalti", () => ({
    initiateKhaltiPayment: (...args: any[]) => mockInitiateKhaltiPayment(...args),
    verifyKhaltiPayment: (...args: any[]) => mockVerifyKhaltiPayment(...args),
}));

import { PaymentService } from "../../services/payment.service";

describe("PaymentService Unit Tests", () => {
    const service = new PaymentService();

    const userId = "507f1f77bcf86cd799439011";
    const bookingId = "507f191e810c19729de860ea";

    const user = {
        _id: userId,
        fullName: "Payment User",
        email: "payment-user@email.com",
    };

    const booking = {
        _id: bookingId,
        bookedBy: userId,
        paymentStatus: "unpaid",
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("initiateKhaltiPayment", () => {
        test("throws 404 if user not found", async () => {
            mockUserRepository.getUserById.mockResolvedValue(null);

            await expect(
                service.initiateKhaltiPayment(userId, bookingId, 1000, "http://localhost:3000/return")
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "User not found",
            });
        });

        test("throws 404 if booking not found", async () => {
            mockUserRepository.getUserById.mockResolvedValue(user);
            mockBookingRepository.getBookingById.mockResolvedValue(null);

            await expect(
                service.initiateKhaltiPayment(userId, bookingId, 1000, "http://localhost:3000/return")
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "Booking not found",
            });
        });

        test("throws 403 if user is not booking owner", async () => {
            mockUserRepository.getUserById.mockResolvedValue(user);
            mockBookingRepository.getBookingById.mockResolvedValue({
                ...booking,
                bookedBy: "507f191e810c19729de860bb",
            });

            await expect(
                service.initiateKhaltiPayment(userId, bookingId, 1000, "http://localhost:3000/return")
            ).rejects.toMatchObject({
                statusCode: 403,
                message: "You are not allowed to pay for this booking",
            });
        });

        test("throws 400 if booking already paid", async () => {
            mockUserRepository.getUserById.mockResolvedValue(user);
            mockBookingRepository.getBookingById.mockResolvedValue({
                ...booking,
                paymentStatus: "paid",
            });

            await expect(
                service.initiateKhaltiPayment(userId, bookingId, 1000, "http://localhost:3000/return")
            ).rejects.toMatchObject({
                statusCode: 400,
                message: "Booking has already been paid",
            });
        });

        test("returns existing pending payment if already created", async () => {
            mockUserRepository.getUserById.mockResolvedValue(user);
            mockBookingRepository.getBookingById.mockResolvedValue(booking);
            mockPaymentRepository.getPaymentByBookingId.mockResolvedValue({
                _id: "payment-1",
                bookingId,
                status: "pending",
                paymentUrl: "https://pay-url",
                pidx: "pidx-1",
                __v: 0,
                toObject: () => ({
                    _id: "payment-1",
                    bookingId,
                    status: "pending",
                    paymentUrl: "https://pay-url",
                    pidx: "pidx-1",
                    __v: 0,
                }),
            });

            const result = await service.initiateKhaltiPayment(
                userId,
                bookingId,
                1000,
                "http://localhost:3000/return"
            );

            expect(result).toEqual({
                payment: {
                    _id: "payment-1",
                    bookingId,
                    status: "pending",
                    paymentUrl: "https://pay-url",
                    pidx: "pidx-1",
                },
                paymentUrl: "https://pay-url",
                pidx: "pidx-1",
            });
        });

        test("creates payment record after Khalti initiation", async () => {
            mockUserRepository.getUserById.mockResolvedValue(user);
            mockBookingRepository.getBookingById.mockResolvedValue(booking);
            mockPaymentRepository.getPaymentByBookingId.mockResolvedValue(null);
            mockInitiateKhaltiPayment.mockResolvedValue({
                pidx: "pidx-2",
                payment_url: "https://pay-url-2",
            });
            mockPaymentRepository.createPayment.mockResolvedValue({
                _id: "payment-2",
                bookingId,
                status: "pending",
                pidx: "pidx-2",
                paymentUrl: "https://pay-url-2",
                __v: 0,
            });

            const result = await service.initiateKhaltiPayment(
                userId,
                bookingId,
                1200,
                "http://localhost:3000/return"
            );

            expect(mockInitiateKhaltiPayment).toHaveBeenCalled();
            expect(mockPaymentRepository.createPayment).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId,
                    bookingId,
                    amount: 1200,
                    status: "pending",
                    paymentMethod: "khalti",
                    pidx: "pidx-2",
                })
            );
            expect(result.payment).toHaveProperty("status", "pending");
        });
    });

    describe("verifyKhaltiPayment", () => {
        test("throws 404 when payment record missing", async () => {
            mockPaymentRepository.getPaymentByPidx.mockResolvedValue(null);

            await expect(service.verifyKhaltiPayment("pidx", bookingId)).rejects.toMatchObject({
                statusCode: 404,
                message: "Payment record not found",
            });
        });

        test("throws 400 on booking id mismatch", async () => {
            mockPaymentRepository.getPaymentByPidx.mockResolvedValue({
                _id: "payment-1",
                bookingId: "other-booking",
            });

            await expect(service.verifyKhaltiPayment("pidx", bookingId)).rejects.toMatchObject({
                statusCode: 400,
                message: "Booking ID mismatch",
            });
        });

        test("marks payment completed and booking paid on success", async () => {
            mockPaymentRepository.getPaymentByPidx.mockResolvedValue({
                _id: "payment-1",
                bookingId,
                toObject: () => ({ _id: "payment-1", bookingId, status: "completed", __v: 0 }),
            });
            mockVerifyKhaltiPayment.mockResolvedValue({
                status: "Completed",
                transaction_id: "txn-1",
            });
            mockPaymentRepository.updatePayment.mockResolvedValue({
                _id: "payment-1",
                bookingId,
                status: "completed",
                __v: 0,
            });
            mockBookingRepository.updateOneBooking.mockResolvedValue({
                _id: bookingId,
                paymentStatus: "paid",
            });

            const result = await service.verifyKhaltiPayment("pidx", bookingId);

            expect(mockPaymentRepository.updatePayment).toHaveBeenCalledWith(
                "payment-1",
                expect.objectContaining({ status: "completed" })
            );
            expect(mockBookingRepository.updateOneBooking).toHaveBeenCalledWith(bookingId, {
                paymentStatus: "paid",
            });
            expect(result).toHaveProperty("success", true);
        });

        test("marks payment failed and throws when verification not completed", async () => {
            mockPaymentRepository.getPaymentByPidx.mockResolvedValue({
                _id: "payment-1",
                bookingId,
            });
            mockVerifyKhaltiPayment.mockResolvedValue({
                status: "Expired",
            });

            await expect(service.verifyKhaltiPayment("pidx", bookingId)).rejects.toMatchObject({
                statusCode: 400,
                message: "Payment status: Expired",
            });

            expect(mockPaymentRepository.updatePayment).toHaveBeenCalledWith(
                "payment-1",
                expect.objectContaining({ status: "failed" })
            );
        });
    });

    describe("query methods", () => {
        test("getPaymentByBookingId throws 404 when missing", async () => {
            mockPaymentRepository.getPaymentByBookingId.mockResolvedValue(null);

            await expect(service.getPaymentByBookingId(bookingId)).rejects.toMatchObject({
                statusCode: 404,
                message: "Payment not found",
            });
        });

        test("getPaymentByBookingId returns sanitized payment", async () => {
            mockPaymentRepository.getPaymentByBookingId.mockResolvedValue({
                _id: "payment-3",
                bookingId,
                __v: 3,
                toObject: () => ({ _id: "payment-3", bookingId, __v: 3 }),
            });

            const result = await service.getPaymentByBookingId(bookingId);
            expect(result).toEqual({ _id: "payment-3", bookingId });
        });

        test("getUserPayments and getAllPayments sanitize list", async () => {
            mockPaymentRepository.getPaymentsByUser.mockResolvedValue([
                { _id: "p1", __v: 0, toObject: () => ({ _id: "p1", __v: 0 }) },
            ]);
            mockPaymentRepository.getAllPayments.mockResolvedValue([
                { _id: "p2", __v: 0, toObject: () => ({ _id: "p2", __v: 0 }) },
            ]);

            const userPayments = await service.getUserPayments(userId, 2, 5, "pending");
            const allPayments = await service.getAllPayments(1, 10, undefined);

            expect(mockPaymentRepository.getPaymentsByUser).toHaveBeenCalledWith(userId, 5, 5, "pending");
            expect(mockPaymentRepository.getAllPayments).toHaveBeenCalledWith(0, 10, undefined);
            expect(userPayments).toEqual([{ _id: "p1" }]);
            expect(allPayments).toEqual([{ _id: "p2" }]);
        });
    });
});
