import { CreateVenueDto, UpdateVenueDto } from "../dtos/venue.dto";
import { HttpError } from "../errors/http-error";
import { VenueRepository } from "../repositories/venue.repository";
import path from "path";
import fs from "fs";

const venueRepository = new VenueRepository();

export class VenueService {
    async createVenue(data: CreateVenueDto, files?: Express.Multer.File[]) {
        const imageNames = (files || []).map((f) => f.filename);

        const venue = await venueRepository.createVenue({
            ...data,
            images: imageNames,
        });

        return venue;
    }

    async getAllVenues() {
        return await venueRepository.getAllVenues({ isActive: true });
    }

    async getVenueById(id: string) {
        const venue = await venueRepository.getVenueById(id);
        if (!venue) throw new HttpError(404, "Venue not found");
        return venue;
    }

    async updateVenue(id: string, data: UpdateVenueDto) {
        const updated = await venueRepository.updateVenue(id, data);
        if (!updated) throw new HttpError(404, "Venue not found");
        return updated;
    }

    async replaceVenueImages(venueId: string, files?: Express.Multer.File[]) {
        if (!files || files.length === 0) {
            throw new HttpError(400, "Please upload at least one image");
        }

        const venue = await venueRepository.getVenueById(venueId);
        if (!venue) throw new HttpError(404, "Venue not found");

        // delete old images if exist
        const oldImages = venue.images || [];
        if (oldImages.length) {
            const uploadDir = path.join(process.cwd(), "uploads");
            await Promise.all(
                oldImages.map(async (img) => {
                    const fp = path.join(uploadDir, img);
                    if (fs.existsSync(fp)) await fs.promises.unlink(fp);
                })
            );
        }

        const newImages = files.map((f) => f.filename);
        const updated = await venueRepository.replaceVenueImages(venueId, newImages);
        if (!updated) throw new HttpError(404, "Venue not found");

        return updated;
    }
}
