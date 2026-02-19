import { NextFunction, Request, Response } from "express";
import z from "zod";
import { VenueService } from "../services/venue.service";
import { CreateVenueDto, UpdateVenueDto } from "../dtos/venue.dto";

const venueService = new VenueService();

export class VenueController {

    async createVenue(req: Request, res: Response) {
        try {
            const parsed = CreateVenueDto.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsed.error),
                });
            }

            const files = (req.files as Express.Multer.File[]) || [];
            const venue = await venueService.createVenue(parsed.data, files);

            return res.status(201).json({
                success: true,
                data: venue,
                message: "Venue created successfully",
            });
        } catch (error: any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async getAllVenues(req: Request, res: Response) {
        const venues = await venueService.getAllVenues();
        return res.status(200).json({ success: true, data: venues });
    }

    async getVenueById(req: Request, res: Response) {
        try {
            const venue = await venueService.getVenueById(req.params.id);
            return res.status(200).json({ success: true, data: venue });
        } catch (error: any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message,
            });
        }
    }

    async updateVenue(req: Request, res: Response) {
        try {
            const parsed = UpdateVenueDto.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsed.error),
                });
            }

            const updated = await venueService.updateVenue(req.params.id, parsed.data);
            return res.status(200).json({
                success: true,
                data: updated,
                message: "Venue updated successfully",
            });
        } catch (error: any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message,
            });
        }
    }

    async replaceVenueImages(req: Request, res: Response) {
        try {
            const files = (req.files as Express.Multer.File[]) || [];
            const updated = await venueService.replaceVenueImages(req.params.id, files);

            return res.status(200).json({
                success: true,
                data: { images: updated.images },
                message: "Venue images updated successfully",
            });
        } catch (error: any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message,
            });
        }
    }
}
