import { Request, Response } from "express";
import z from "zod";
import { CreatePackageDto, UpdatePackageDto } from "../dtos/package.dto";
import { PackageService } from "../services/package.service";

let packageService = new PackageService();

export class PackageController {
    async getPackagesByVenue(req: Request, res: Response) {
        try {
            const venueId = req.params.venueId as string;
            if (!venueId) {
                return res.status(400).json({
                    success: false,
                    message: "Venue Id not found",
                });
            }

            const packages = await packageService.getPackagesByVenueId(venueId);

            return res.status(200).json({
                success: true,
                data: packages,
                message: "Packages fetched successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async getPackageById(req: Request, res: Response) {
        try {
            const packageId = req.params.id as string;
            if (!packageId) {
                return res.status(400).json({
                    success: false,
                    message: "Package Id not found",
                });
            }

            const pkg = await packageService.getPackageById(packageId);

            return res.status(200).json({
                success: true,
                data: pkg,
                message: "Package fetched successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async getAllPackages(req: Request, res: Response) {
        try {
            const { page, size, search } = req.query;

            const result = await packageService.getAllPackages({
                page: page as string | undefined,
                size: size as string | undefined,
                search: search as string | undefined,
            });

            return res.status(200).json({
                success: true,
                data: result.packages,
                pagination: result.pagination,
                message: "Packages fetched successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async createPackage(req: Request, res: Response) {
        try {
            const parsedData = CreatePackageDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedData.error),
                });
            }

            const files = (req.files as Express.Multer.File[]) || [];

            const created = await packageService.createPackage(parsedData.data, files);

            return res.status(201).json({
                success: true,
                data: created,
                message: "Package created successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    // (JSON update, no images)
    async updatePackage(req: Request, res: Response) {
        try {
            const packageId = req.params.id as string;
            if (!packageId) {
                return res.status(400).json({
                    success: false,
                    message: "Package Id not found",
                });
            }

            const parsedData = UpdatePackageDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedData.error),
                });
            }

            const updated = await packageService.updatePackage(packageId, parsedData.data);

            return res.status(200).json({
                success: true,
                data: updated,
                message: "Package updated successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async deletePackage(req: Request, res: Response) {
        try {
            const packageId = req.params.id as string;
            if (!packageId) {
                return res.status(400).json({
                    success: false,
                    message: "Package Id not found",
                });
            }

            await packageService.deletePackage(packageId);

            return res.status(200).json({
                success: true,
                message: "Package deleted successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }

    async replacePackageImages(req: Request, res: Response) {
        try {
            const packageId = req.params.id as string;
            if (!packageId) {
                return res.status(400).json({
                    success: false,
                    message: "Package Id not found",
                });
            }

            const files = (req.files as Express.Multer.File[]) || [];
            if (!files.length) {
                return res.status(400).json({
                    success: false,
                    message: "Please upload at least one image",
                });
            }

            const updated = await packageService.replacePackageImages(packageId, files);

            return res.status(200).json({
                success: true,
                data: updated,
                message: "Package images updated successfully",
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error",
            });
        }
    }
}
