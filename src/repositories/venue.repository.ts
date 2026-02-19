import { QueryFilter } from "mongoose";
import { IVenue, VenueModel } from "../models/venue.model";

export interface IVenueRepository {
    createVenue(data: Partial<IVenue>): Promise<IVenue>;
    getAllVenues(filter?: QueryFilter<IVenue>): Promise<IVenue[]>;
    getVenueById(id: string): Promise<IVenue | null>;
    updateVenue(id: string, data: Partial<IVenue>): Promise<IVenue | null>;
    deleteVenue(id: string): Promise<boolean | null>;

    addVenueImages(id: string, images: string[]): Promise<IVenue | null>;
    replaceVenueImages(id: string, images: string[]): Promise<IVenue | null>;
}

export class VenueRepository implements IVenueRepository {
    async createVenue(data: Partial<IVenue>): Promise<IVenue> {
        const venue = new VenueModel(data);
        return await venue.save();
    }

    async getAllVenues(filter: QueryFilter<IVenue> = {}): Promise<IVenue[]> {
        return await VenueModel.find(filter).sort({ createdAt: -1 });
    }

    async getVenueById(id: string): Promise<IVenue | null> {
        return await VenueModel.findById(id);
    }

    async updateVenue(id: string, data: Partial<IVenue>): Promise<IVenue | null> {
        return await VenueModel.findByIdAndUpdate(id, data, { new: true });
    }

    async deleteVenue(id: string): Promise<boolean | null> {
        const result = await VenueModel.findByIdAndDelete(id);
        return result ? true : false;
    }

    async addVenueImages(id: string, images: string[]): Promise<IVenue | null> {
        return await VenueModel.findByIdAndUpdate(
            id,
            { $push: { images: { $each: images } } },
            { new: true }
        );
    }

    async replaceVenueImages(id: string, images: string[]): Promise<IVenue | null> {
        return await VenueModel.findByIdAndUpdate(id, { images }, { new: true });
    }
}
