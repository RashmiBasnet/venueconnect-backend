import { QueryFilter } from "mongoose";
import { IPackage, PackageModel } from "../models/package.model";
import { VenueModel } from "../models/venue.model";

export interface IPackageRepository {
    createPackage(data: Partial<IPackage>): Promise<IPackage>;

    getAllPackages({
        page,
        size,
        search,
    }: {
        page: number;
        size: number;
        search?: string;
    }): Promise<{ packages: IPackage[]; totalPackages: number }>;

    getPackageById(id: string): Promise<IPackage | null>;

    getPackagesByVenueId(
        venueId: string,
        onlyActive?: boolean
    ): Promise<IPackage[]>;

    updateOnePackage(
        id: string,
        data: Partial<IPackage>
    ): Promise<IPackage | null>;

    deleteOnePackage(id: string): Promise<boolean | null>;
}

export class PackageRepository implements IPackageRepository {
    async createPackage(data: Partial<IPackage>): Promise<IPackage> {
        const pkg = new PackageModel(data);
        return await pkg.save();
    }

    async getAllPackages({
        page,
        size,
        search,
    }: {
        page: number;
        size: number;
        search?: string;
    }): Promise<{ packages: IPackage[]; totalPackages: number }> {
        const filter: QueryFilter<IPackage> = {};

        if (search?.trim()) {
            const regex = new RegExp(search.trim(), "i");

            const venues = await VenueModel.find(
                { name: { $regex: regex } },
                { _id: 1 }
            ).lean();

            const venueIds = venues.map((v) => v._id);

            filter.$or = [
                { name: { $regex: regex } },
                { description: { $regex: regex } },
                { inclusions: { $regex: regex } },
                ...(venueIds.length ? [{ venueId: { $in: venueIds } }] : []),
            ];
        }

        const [packages, totalPackages] = await Promise.all([
            PackageModel.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * size)
                .limit(size)
                .populate("venueId", "name address pricePerPlate capacity isActive images"),
            PackageModel.countDocuments(filter),
        ]);

        return { packages, totalPackages };
    }

    async getPackageById(id: string): Promise<IPackage | null> {
        return await PackageModel.findById(id).populate("venueId", "name address pricePerPlate capacity isActive images");
    }

    async getPackagesByVenueId(
        venueId: string,
        onlyActive: boolean = true
    ): Promise<IPackage[]> {
        const filter: QueryFilter<IPackage> = { venueId };

        if (onlyActive) {
            filter.isActive = true;
        }

        return await PackageModel.find(filter).sort({ createdAt: -1 });
    }

    async updateOnePackage(
        id: string,
        data: Partial<IPackage>
    ): Promise<IPackage | null> {
        return await PackageModel.findByIdAndUpdate(id, data, { new: true });
    }

    async deleteOnePackage(id: string): Promise<boolean | null> {
        const result = await PackageModel.findByIdAndDelete(id);
        return result ? true : false;
    }
}
