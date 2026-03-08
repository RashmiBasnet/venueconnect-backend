import { QueryFilter } from "mongoose";
import { IBooking, BookingModel } from "../models/booking.model";
import { VenueModel } from "../models/venue.model";
import { PackageModel } from "../models/package.model";
import { UserModel } from "../models/user.model";

export interface IBookingRepository {
    createBooking(data: Partial<IBooking>): Promise<IBooking>;

    getAllBookings({
        page,
        size,
        search,
    }: {
        page: number;
        size: number;
        search?: string;
    }): Promise<{ bookings: IBooking[]; totalBookings: number }>;

    getBookingById(id: string): Promise<IBooking | null>;

    getBookingsByUserId(userId: string): Promise<IBooking[]>;

    updateOneBooking(id: string, data: Partial<IBooking>): Promise<IBooking | null>;

    deleteOneBooking(id: string): Promise<boolean | null>;

    hasTimeConflict(args: {
        venueId: string;
        eventDate: Date;
        startTime: string;
        endTime: string;
        excludeBookingId?: string;
    }): Promise<boolean>;
}

export class BookingRepository implements IBookingRepository {
    async createBooking(data: Partial<IBooking>): Promise<IBooking> {
        const booking = new BookingModel(data);
        return await booking.save();
    }

    async getAllBookings({
        page,
        size,
        search,
    }: {
        page: number;
        size: number;
        search?: string;
    }): Promise<{ bookings: IBooking[]; totalBookings: number }> {
        const filter: QueryFilter<IBooking> = {};

        if (search?.trim()) {
            const regex = new RegExp(search.trim(), "i");

            const venues = await VenueModel.find({ name: { $regex: regex } }, { _id: 1 }).lean();
            const packages = await PackageModel.find({ name: { $regex: regex } }, { _id: 1 }).lean();
            const users = await UserModel.find(
                {
                    $or: [
                        { fullName: { $regex: regex } },
                        { email: { $regex: regex } },
                        { phoneNumber: { $regex: regex } },
                    ],
                },
                { _id: 1 }
            ).lean();

            const venueIds = venues.map((v) => v._id);
            const packageIds = packages.map((p) => p._id);
            const userIds = users.map((u) => u._id);

            filter.$or = [
                { contactName: { $regex: regex } },
                { contactPhone: { $regex: regex } },
                { contactEmail: { $regex: regex } },
                ...(venueIds.length ? [{ venueId: { $in: venueIds } }] : []),
                ...(packageIds.length ? [{ packageId: { $in: packageIds } }] : []),
                ...(userIds.length ? [{ bookedBy: { $in: userIds } }] : []),
            ];
        }

        const [bookings, totalBookings] = await Promise.all([
            BookingModel.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * size)
                .limit(size)
                .populate("venueId", "name address pricePerPlate capacity isActive images")
                .populate("packageId", "name pricePerPlate capacity isActive images")
                .populate("bookedBy", "fullName email phoneNumber profilePicture"),
            BookingModel.countDocuments(filter),
        ]);

        return { bookings, totalBookings };
    }

    async getBookingById(id: string): Promise<IBooking | null> {
        return await BookingModel.findById(id)
            .populate("venueId", "name address pricePerPlate capacity isActive images")
            .populate("packageId", "name pricePerPlate capacity isActive images")
            .populate("bookedBy", "fullName email phoneNumber profileImage");
    }

    async getBookingsByUserId(userId: string): Promise<IBooking[]> {
        return await BookingModel.find({ bookedBy: userId })
            .sort({ createdAt: -1 })
            .populate("venueId", "name address pricePerPlate capacity isActive images")
            .populate("packageId", "name pricePerPlate capacity isActive images");
    }

    async updateOneBooking(id: string, data: Partial<IBooking>): Promise<IBooking | null> {
        return await BookingModel.findByIdAndUpdate(id, data, { new: true })
            .populate("venueId", "name address pricePerPlate capacity isActive images")
            .populate("packageId", "name pricePerPlate capacity isActive images")
            .populate("bookedBy", "fullName email phoneNumber profileImage");
    }

    async deleteOneBooking(id: string): Promise<boolean | null> {
        const result = await BookingModel.findByIdAndDelete(id);
        return result ? true : false;
    }

    async hasTimeConflict({
        venueId,
        eventDate,
        startTime,
        endTime,
        excludeBookingId,
    }: {
        venueId: string;
        eventDate: Date;
        startTime: string;
        endTime: string;
        excludeBookingId?: string;
    }): Promise<boolean> {
        const dayStart = new Date(eventDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const base: any = {
            venueId,
            eventDate: { $gte: dayStart, $lt: dayEnd },
            status: { $in: ["pending", "confirmed"] },
            startTime: { $lt: endTime },
            endTime: { $gt: startTime },
        };

        if (excludeBookingId) base._id = { $ne: excludeBookingId };

        const exists = await BookingModel.exists(base);
        return !!exists;
    }
}