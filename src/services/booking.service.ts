import mongoose from "mongoose";
import { HttpError } from "../errors/http-error";
import { CreateBookingDto, UpdateBookingStatusDto, UpdatePaymentStatusDto } from "../dtos/booking.dto";
import { BookingRepository } from "../repositories/booking.repository";
import { VenueModel } from "../models/venue.model";
import { PackageModel } from "../models/package.model";

let bookingRepository = new BookingRepository();

export class BookingService {
    async createBooking(data: CreateBookingDto, bookedById: string) {
        if (!mongoose.Types.ObjectId.isValid(bookedById)) {
            throw new HttpError(401, "Unauthorized");
        }

        if (!mongoose.Types.ObjectId.isValid(data.venueId)) {
            throw new HttpError(400, "Invalid venueId");
        }
        if (data.packageId && !mongoose.Types.ObjectId.isValid(data.packageId)) {
            throw new HttpError(400, "Invalid packageId");
        }

        const venue = await VenueModel.findById(data.venueId);
        if (!venue) throw new HttpError(404, "Venue not found");
        if ((venue as any).isActive === false) throw new HttpError(400, "Venue is not active");

        // pricing decision
        let pricePerPlate = (venue as any).pricePerPlate;

        if (data.packageId) {
            const pkg = await PackageModel.findOne({
                _id: data.packageId,
                venueId: data.venueId,
                isActive: true,
            });

            if (!pkg) throw new HttpError(404, "Package not found for this venue");

            pricePerPlate = (pkg as any).pricePerPlate;
        }

        // capacity check (venue capacity)
        const minGuests = (venue as any)?.capacity?.minGuests ?? 1;
        const maxGuests = (venue as any)?.capacity?.maxGuests ?? Number.MAX_SAFE_INTEGER;

        if (data.guests < minGuests) throw new HttpError(400, `Guests must be at least ${minGuests}`);
        if (data.guests > maxGuests) throw new HttpError(400, `Guests must be at most ${maxGuests}`);

        const eventDate = new Date(data.eventDate);
        if (Number.isNaN(eventDate.getTime())) throw new HttpError(400, "Invalid eventDate");

        // conflict check
        const conflict = await bookingRepository.hasTimeConflict({
            venueId: data.venueId,
            eventDate,
            startTime: data.startTime,
            endTime: data.endTime,
        });

        if (conflict) {
            throw new HttpError(400, "This venue is already booked for the selected time");
        }

        const totalPrice = pricePerPlate * data.guests;

        const created = await bookingRepository.createBooking({
            venueId: new mongoose.Types.ObjectId(data.venueId) as any,
            packageId: data.packageId ? (new mongoose.Types.ObjectId(data.packageId) as any) : null,
            bookedBy: new mongoose.Types.ObjectId(bookedById) as any,

            eventDate,
            startTime: data.startTime,
            endTime: data.endTime,
            guests: data.guests,

            pricePerPlate,
            totalPrice,

            status: "pending",
            paymentStatus: "unpaid",

            contactName: data.contactName,
            contactPhone: data.contactPhone,
            contactEmail: data.contactEmail,

            note: data.note,
            extras: (data.extras as any) || [],
        } as any);

        return created;
    }

    async getAllBookings({
        page,
        size,
        search,
    }: {
        page?: string;
        size?: string;
        search?: string;
    }) {
        const currentPage = page ? parseInt(page, 10) : 1;
        const currentSize = size ? parseInt(size, 10) : 10;
        const currentSearch = search || "";

        const { bookings, totalBookings } = await bookingRepository.getAllBookings({
            page: currentPage,
            size: currentSize,
            search: currentSearch,
        });

        return {
            bookings,
            pagination: {
                page: currentPage,
                size: currentSize,
                totalPages: Math.ceil(totalBookings / currentSize),
                totalItems: totalBookings,
            },
        };
    }

    async getBookingById(bookingId: string) {
        const booking = await bookingRepository.getBookingById(bookingId);
        if (!booking) throw new HttpError(404, "Booking not found");
        return booking;
    }

    async getMyBookingById(bookingId: string, userId: string) {
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            throw new HttpError(400, "Invalid bookingId");
        }
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new HttpError(400, "Invalid userId");
        }

        const booking = await bookingRepository.getBookingById(bookingId);
        if (!booking) throw new HttpError(404, "Booking not found");

        const bookingUserId = String((booking as any).bookedBy?._id || (booking as any).bookedBy);
        if (bookingUserId !== String(userId)) {
            throw new HttpError(403, "You are not allowed to view this booking");
        }

        return booking;
    }

    async getBookingsByUserId(userId: string) {
        if (!mongoose.Types.ObjectId.isValid(userId)) throw new HttpError(400, "Invalid userId");
        return await bookingRepository.getBookingsByUserId(userId);
    }

    async updateBookingStatus(bookingId: string, data: UpdateBookingStatusDto) {
        const booking = await bookingRepository.getBookingById(bookingId);
        if (!booking) throw new HttpError(404, "Booking not found");

        const updated = await bookingRepository.updateOneBooking(bookingId, {
            status: data.status as any,
        } as any);

        if (!updated) throw new HttpError(404, "Booking not found");
        return updated;
    }

    async updatePaymentStatus(bookingId: string, data: UpdatePaymentStatusDto) {
        const booking = await bookingRepository.getBookingById(bookingId);
        if (!booking) throw new HttpError(404, "Booking not found");

        const updated = await bookingRepository.updateOneBooking(bookingId, {
            paymentStatus: data.paymentStatus as any,
        } as any);

        if (!updated) throw new HttpError(404, "Booking not found");
        return updated;
    }

    async cancelBooking(bookingId: string) {
        const booking = await bookingRepository.getBookingById(bookingId);
        if (!booking) throw new HttpError(404, "Booking not found");

        const updated = await bookingRepository.updateOneBooking(bookingId, {
            status: "cancelled" as any,
        } as any);

        if (!updated) throw new HttpError(404, "Booking not found");
        return updated;
    }
}