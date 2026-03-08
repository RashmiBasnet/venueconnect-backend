import { Request, Response } from "express";
import z from "zod";
import {
    CreateBookingDto,
    UpdateBookingStatusDto,
    UpdatePaymentStatusDto,
} from "../dtos/booking.dto";
import { BookingService } from "../services/booking.service";

let bookingService = new BookingService();

export class BookingController {
    async getAllBookings(req: Request, res: Response) {
        try {
            const { page, size, search } = req.query;

            const result = await bookingService.getAllBookings({
                page: page as string | undefined,
                size: size as string | undefined,
                search: search as string | undefined,
            });

            return res.status(200).json({
                success: true,
                data: result.bookings,
                pagination: result.pagination,
                message: "Bookings fetched successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async getBookingById(req: Request, res: Response) {
        try {
            const bookingId = req.params.id as string;
            if (!bookingId) {
                return res.status(400).json({ success: false, message: "Booking Id not found" });
            }

            const booking = await bookingService.getBookingById(bookingId);

            return res.status(200).json({
                success: true,
                data: booking,
                message: "Booking fetched successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async createBooking(req: Request, res: Response) {
        try {
            const parsedData = CreateBookingDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedData.error),
                });
            }

            const userId = (req as any)?.user?._id || (req as any)?.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const created = await bookingService.createBooking(parsedData.data, String(userId));

            return res.status(201).json({
                success: true,
                data: created,
                message: "Booking created successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async updateBookingStatus(req: Request, res: Response) {
        try {
            const bookingId = req.params.id as string;
            if (!bookingId) {
                return res.status(400).json({ success: false, message: "Booking Id not found" });
            }

            const parsedData = UpdateBookingStatusDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedData.error),
                });
            }

            const updated = await bookingService.updateBookingStatus(bookingId, parsedData.data);

            return res.status(200).json({
                success: true,
                data: updated,
                message: "Booking status updated successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async updatePaymentStatus(req: Request, res: Response) {
        try {
            const bookingId = req.params.id as string;
            if (!bookingId) {
                return res.status(400).json({ success: false, message: "Booking Id not found" });
            }

            const parsedData = UpdatePaymentStatusDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedData.error),
                });
            }

            const updated = await bookingService.updatePaymentStatus(bookingId, parsedData.data);

            return res.status(200).json({
                success: true,
                data: updated,
                message: "Payment status updated successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async getMyBookings(req: Request, res: Response) {
        try {
            const userId = (req as any)?.user?._id || (req as any)?.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const bookings = await bookingService.getBookingsByUserId(String(userId));

            return res.status(200).json({
                success: true,
                data: bookings,
                message: "My bookings fetched successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async getMyBookingById(req: Request, res: Response) {
        try {
            const bookingId = req.params.id as string;
            if (!bookingId) {
                return res.status(400).json({ success: false, message: "Booking Id not found" });
            }

            const userId = (req as any)?.user?._id || (req as any)?.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const booking = await bookingService.getMyBookingById(bookingId, String(userId));

            return res.status(200).json({
                success: true,
                data: booking,
                message: "Booking fetched successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }
}