import z from "zod";
import { PackageSchema } from "../types/package.type";

export const CreatePackageDto = PackageSchema.pick({
    venueId: true,
    name: true,
    description: true,
    pricePerPlate: true,
    capacity: true,
    inclusions: true,
    isActive: true,
});

export type CreatePackageDto = z.infer<typeof CreatePackageDto>;

export const UpdatePackageDto = CreatePackageDto.partial();
export type UpdatePackageDto = z.infer<typeof UpdatePackageDto>;
