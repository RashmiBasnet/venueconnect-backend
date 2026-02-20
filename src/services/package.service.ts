import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { HttpError } from "../errors/http-error";
import { CreatePackageDto, UpdatePackageDto } from "../dtos/package.dto";
import { PackageRepository } from "../repositories/package.repository";

let packageRepository = new PackageRepository();

export class PackageService {
    async createPackage(data: CreatePackageDto, files?: Express.Multer.File[]) {
        if (!mongoose.Types.ObjectId.isValid(data.venueId)) {
            throw new HttpError(400, "Invalid venueId");
        }

        const images = files?.map((f) => f.filename) || [];

        const venueObjectId = new mongoose.Types.ObjectId(data.venueId);

        const newPackage = await packageRepository.createPackage({
            ...data,
            venueId: venueObjectId as any,
            images,
        } as any);

        return newPackage;
    }

    async getAllPackages({
        page,
        size,
        search,
    }: {
        page?: string | undefined;
        size?: string | undefined;
        search?: string | undefined;
    }) {
        const currentPage = page ? parseInt(page, 10) : 1;
        const currentSize = size ? parseInt(size, 10) : 10;
        const currentSearch = search || "";

        const { packages, totalPackages } = await packageRepository.getAllPackages({
            page: currentPage,
            size: currentSize,
            search: currentSearch,
        });

        return {
            packages,
            pagination: {
                page: currentPage,
                size: currentSize,
                totalPages: Math.ceil(totalPackages / currentSize),
                totalItems: totalPackages,
            },
        };
    }

    async getPackageById(packageId: string) {
        const pkg = await packageRepository.getPackageById(packageId);
        if (!pkg) {
            throw new HttpError(404, "Package not found");
        }
        return pkg;
    }

    async getPackagesByVenueId(venueId: string) {
        if (!mongoose.Types.ObjectId.isValid(venueId)) {
            throw new HttpError(400, "Invalid venueId");
        }
        const packages = await packageRepository.getPackagesByVenueId(venueId, true);
        return packages;
    }

    async updatePackage(packageId: string, data: UpdatePackageDto) {
        const pkg = await packageRepository.getPackageById(packageId);
        if (!pkg) {
            throw new HttpError(404, "Package not found");
        }

        if (data.venueId) {
            if (!mongoose.Types.ObjectId.isValid(data.venueId)) {
                throw new HttpError(400, "Invalid venueId");
            }
            (data as any).venueId = new mongoose.Types.ObjectId(data.venueId);
        }

        const updated = await packageRepository.updateOnePackage(packageId, data as any);
        if (!updated) {
            throw new HttpError(404, "Package not found");
        }

        return updated;
    }

    async deletePackage(packageId: string) {
        const pkg = await packageRepository.getPackageById(packageId);
        if (!pkg) {
            throw new HttpError(404, "Package not found");
        }

        const uploadDir = path.join(process.cwd(), "uploads");
        const images = (pkg as any).images || [];

        for (const img of images) {
            const imgPath = path.join(uploadDir, img);
            if (fs.existsSync(imgPath)) {
                await fs.promises.unlink(imgPath);
            }
        }

        const ok = await packageRepository.deleteOnePackage(packageId);
        if (!ok) {
            throw new HttpError(404, "Package not found");
        }

        return ok;
    }

    async replacePackageImages(packageId: string, files?: Express.Multer.File[]) {
        if (!files || files.length === 0) {
            throw new HttpError(400, "Please upload at least one image");
        }

        const pkg = await packageRepository.getPackageById(packageId);
        if (!pkg) {
            throw new HttpError(404, "Package not found");
        }

        const uploadDir = path.join(process.cwd(), "uploads");
        const oldImages = (pkg as any).images || [];

        for (const img of oldImages) {
            const oldPath = path.join(uploadDir, img);
            if (fs.existsSync(oldPath)) {
                await fs.promises.unlink(oldPath);
            }
        }

        const newImages = files.map((f) => f.filename);

        const updated = await packageRepository.updateOnePackage(packageId, {
            images: newImages,
        } as any);

        if (!updated) {
            throw new HttpError(404, "Package not found");
        }

        return updated;
    }
}
