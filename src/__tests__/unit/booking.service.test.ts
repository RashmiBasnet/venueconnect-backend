import mongoose from "mongoose";

const mockBookingRepository = {
    createBooking: jest.fn(),
    getAllBookings: jest.fn(),
    getBookingById: jest.fn(),
    getBookingsByUserId: jest.fn(),
    updateOneBooking: jest.fn(),
    hasTimeConflict: jest.fn(),
};

const mockVenueModel = {
    findById: jest.fn(),
};

const mockPackageModel = {
    findOne: jest.fn(),
};

jest.mock("../../repositories/booking.repository", () => {
    return {
        BookingRepository: jest.fn().mockImplementation(() => mockBookingRepository),
    };
});

jest.mock("../../models/venue.model", () => ({
    VenueModel: mockVenueModel,
}));

jest.mock("../../models/package.model", () => ({
    PackageModel: mockPackageModel,
}));

import { BookingService } from "../../services/booking.service";

describe("BookingService Unit Tests", () => {
    const service = new BookingService();

    const userId = "507f1f77bcf86cd799439011";
    const venueId = "507f191e810c19729de860ea";
    const packageId = "507f191e810c19729de860eb";
    const bookingId = "507f191e810c19729de860ec";

    const baseVenue = {
        _id: venueId,
        pricePerPlate: 1800,
        isActive: true,
        capacity: { minGuests: 20, maxGuests: 300 },
    };

    const basePackage = {
        _id: packageId,
        venueId,
        pricePerPlate: 2500,
        isActive: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("createBooking", () => {
        const payload = {
            venueId,
            packageId,
            eventDate: "2027-01-10",
            startTime: "10:00",
            endTime: "12:00",
            guests: 100,
            contactName: "Booker",
            contactPhone: "9800000000",
            contactEmail: "booker@email.com",
        };

        test("should throw 401 for invalid bookedBy id", async () => {
            await expect(service.createBooking(payload as any, "bad-id")).rejects.toMatchObject({
                statusCode: 401,
                message: "Unauthorized",
            });
        });

        test("should throw 400 for invalid venue id", async () => {
            await expect(
                service.createBooking({ ...payload, venueId: "bad-id" } as any, userId)
            ).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid venueId",
            });
        });

        test("should throw 400 for invalid package id", async () => {
            await expect(
                service.createBooking({ ...payload, packageId: "bad-id" } as any, userId)
            ).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid packageId",
            });
        });

        test("should throw 404 when venue is not found", async () => {
            mockVenueModel.findById.mockResolvedValue(null);

            await expect(service.createBooking(payload as any, userId)).rejects.toMatchObject({
                statusCode: 404,
                message: "Venue not found",
            });
        });

        test("should throw 400 when venue is inactive", async () => {
            mockVenueModel.findById.mockResolvedValue({ ...baseVenue, isActive: false });

            await expect(service.createBooking(payload as any, userId)).rejects.toMatchObject({
                statusCode: 400,
                message: "Venue is not active",
            });
        });

        test("should throw 404 when package does not belong to venue or inactive", async () => {
            mockVenueModel.findById.mockResolvedValue(baseVenue);
            mockPackageModel.findOne.mockResolvedValue(null);

            await expect(service.createBooking(payload as any, userId)).rejects.toMatchObject({
                statusCode: 404,
                message: "Package not found for this venue",
            });
        });

        test("should throw 400 when guests are below minimum", async () => {
            mockVenueModel.findById.mockResolvedValue(baseVenue);
            mockPackageModel.findOne.mockResolvedValue(basePackage);

            await expect(
                service.createBooking({ ...payload, guests: 10 } as any, userId)
            ).rejects.toMatchObject({
                statusCode: 400,
                message: "Guests must be at least 20",
            });
        });

        test("should throw 400 when guests exceed maximum", async () => {
            mockVenueModel.findById.mockResolvedValue(baseVenue);
            mockPackageModel.findOne.mockResolvedValue(basePackage);

            await expect(
                service.createBooking({ ...payload, guests: 500 } as any, userId)
            ).rejects.toMatchObject({
                statusCode: 400,
                message: "Guests must be at most 300",
            });
        });

        test("should throw 400 when eventDate is invalid", async () => {
            mockVenueModel.findById.mockResolvedValue(baseVenue);
            mockPackageModel.findOne.mockResolvedValue(basePackage);

            await expect(
                service.createBooking({ ...payload, eventDate: "bad-date" } as any, userId)
            ).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid eventDate",
            });
        });

        test("should throw 400 when time conflict exists", async () => {
            mockVenueModel.findById.mockResolvedValue(baseVenue);
            mockPackageModel.findOne.mockResolvedValue(basePackage);
            mockBookingRepository.hasTimeConflict.mockResolvedValue(true);

            await expect(service.createBooking(payload as any, userId)).rejects.toMatchObject({
                statusCode: 400,
                message: "This venue is already booked for the selected time",
            });
        });

        test("should create booking using venue price when package is not provided", async () => {
            mockVenueModel.findById.mockResolvedValue(baseVenue);
            mockBookingRepository.hasTimeConflict.mockResolvedValue(false);
            mockBookingRepository.createBooking.mockResolvedValue({
                _id: bookingId,
                pricePerPlate: 1800,
                totalPrice: 180000,
            });

            const result = await service.createBooking(
                {
                    venueId,
                    eventDate: "2027-01-10",
                    startTime: "10:00",
                    endTime: "12:00",
                    guests: 100,
                    contactName: "Booker",
                    contactPhone: "9800000000",
                } as any,
                userId
            );

            expect(mockBookingRepository.createBooking).toHaveBeenCalledWith(
                expect.objectContaining({
                    pricePerPlate: 1800,
                    totalPrice: 180000,
                    status: "pending",
                    paymentStatus: "unpaid",
                })
            );
            expect(result).toEqual({
                _id: bookingId,
                pricePerPlate: 1800,
                totalPrice: 180000,
            });
        });

        test("should create booking using package price when package is provided", async () => {
            mockVenueModel.findById.mockResolvedValue(baseVenue);
            mockPackageModel.findOne.mockResolvedValue(basePackage);
            mockBookingRepository.hasTimeConflict.mockResolvedValue(false);
            mockBookingRepository.createBooking.mockResolvedValue({
                _id: bookingId,
                pricePerPlate: 2500,
                totalPrice: 250000,
            });

            const result = await service.createBooking(payload as any, userId);

            expect(mockPackageModel.findOne).toHaveBeenCalledWith({
                _id: packageId,
                venueId,
                isActive: true,
            });
            expect(mockBookingRepository.createBooking).toHaveBeenCalledWith(
                expect.objectContaining({
                    pricePerPlate: 2500,
                    totalPrice: 250000,
                    venueId: expect.any(mongoose.Types.ObjectId),
                    bookedBy: expect.any(mongoose.Types.ObjectId),
                })
            );
            expect(result).toEqual({
                _id: bookingId,
                pricePerPlate: 2500,
                totalPrice: 250000,
            });
        });
    });

    describe("getAllBookings", () => {
        test("should map pagination fields", async () => {
            mockBookingRepository.getAllBookings.mockResolvedValue({
                bookings: [{ _id: bookingId }],
                totalBookings: 11,
            });

            const result = await service.getAllBookings({
                page: "2",
                size: "5",
                search: "Booker",
            });

            expect(mockBookingRepository.getAllBookings).toHaveBeenCalledWith({
                page: 2,
                size: 5,
                search: "Booker",
            });
            expect(result.pagination).toEqual({
                page: 2,
                size: 5,
                totalPages: 3,
                totalItems: 11,
            });
        });
    });

    describe("getBookingById", () => {
        test("should throw 404 when booking is missing", async () => {
            mockBookingRepository.getBookingById.mockResolvedValue(null);

            await expect(service.getBookingById(bookingId)).rejects.toMatchObject({
                statusCode: 404,
                message: "Booking not found",
            });
        });

        test("should return booking when present", async () => {
            const booking = { _id: bookingId };
            mockBookingRepository.getBookingById.mockResolvedValue(booking);

            const result = await service.getBookingById(bookingId);
            expect(result).toEqual(booking);
        });
    });

    describe("getMyBookingById", () => {
        test("should throw 400 for invalid booking id", async () => {
            await expect(service.getMyBookingById("bad-id", userId)).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid bookingId",
            });
        });

        test("should throw 400 for invalid user id", async () => {
            await expect(service.getMyBookingById(bookingId, "bad-id")).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid userId",
            });
        });

        test("should throw 404 when booking not found", async () => {
            mockBookingRepository.getBookingById.mockResolvedValue(null);

            await expect(service.getMyBookingById(bookingId, userId)).rejects.toMatchObject({
                statusCode: 404,
                message: "Booking not found",
            });
        });

        test("should throw 403 when user is not owner", async () => {
            mockBookingRepository.getBookingById.mockResolvedValue({
                _id: bookingId,
                bookedBy: "507f191e810c19729de860dd",
            });

            await expect(service.getMyBookingById(bookingId, userId)).rejects.toMatchObject({
                statusCode: 403,
                message: "You are not allowed to view this booking",
            });
        });

        test("should return booking when user is owner", async () => {
            const booking = {
                _id: bookingId,
                bookedBy: { _id: userId },
            };
            mockBookingRepository.getBookingById.mockResolvedValue(booking);

            const result = await service.getMyBookingById(bookingId, userId);
            expect(result).toEqual(booking);
        });
    });

    describe("getBookingsByUserId", () => {
        test("should throw 400 for invalid userId", async () => {
            await expect(service.getBookingsByUserId("bad-id")).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid userId",
            });
        });

        test("should return user bookings", async () => {
            mockBookingRepository.getBookingsByUserId.mockResolvedValue([{ _id: bookingId }]);

            const result = await service.getBookingsByUserId(userId);
            expect(mockBookingRepository.getBookingsByUserId).toHaveBeenCalledWith(userId);
            expect(result).toEqual([{ _id: bookingId }]);
        });
    });

    describe("update status/payment and cancel", () => {
        test("updateBookingStatus should throw 404 when booking missing", async () => {
            mockBookingRepository.getBookingById.mockResolvedValue(null);

            await expect(
                service.updateBookingStatus(bookingId, { status: "confirmed" } as any)
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "Booking not found",
            });
        });

        test("updateBookingStatus should update status", async () => {
            mockBookingRepository.getBookingById.mockResolvedValue({ _id: bookingId });
            mockBookingRepository.updateOneBooking.mockResolvedValue({
                _id: bookingId,
                status: "confirmed",
            });

            const result = await service.updateBookingStatus(bookingId, {
                status: "confirmed",
            } as any);

            expect(mockBookingRepository.updateOneBooking).toHaveBeenCalledWith(bookingId, {
                status: "confirmed",
            });
            expect(result).toEqual({
                _id: bookingId,
                status: "confirmed",
            });
        });

        test("updatePaymentStatus should update payment status", async () => {
            mockBookingRepository.getBookingById.mockResolvedValue({ _id: bookingId });
            mockBookingRepository.updateOneBooking.mockResolvedValue({
                _id: bookingId,
                paymentStatus: "paid",
            });

            const result = await service.updatePaymentStatus(bookingId, {
                paymentStatus: "paid",
            } as any);

            expect(mockBookingRepository.updateOneBooking).toHaveBeenCalledWith(bookingId, {
                paymentStatus: "paid",
            });
            expect(result).toEqual({
                _id: bookingId,
                paymentStatus: "paid",
            });
        });

        test("cancelBooking should set status to cancelled", async () => {
            mockBookingRepository.getBookingById.mockResolvedValue({ _id: bookingId });
            mockBookingRepository.updateOneBooking.mockResolvedValue({
                _id: bookingId,
                status: "cancelled",
            });

            const result = await service.cancelBooking(bookingId);
            expect(mockBookingRepository.updateOneBooking).toHaveBeenCalledWith(bookingId, {
                status: "cancelled",
            });
            expect(result).toEqual({
                _id: bookingId,
                status: "cancelled",
            });
        });
    });
});
