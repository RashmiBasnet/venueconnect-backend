import fs from "fs";

const mockPackageRepository = {
    createPackage: jest.fn(),
    getAllPackages: jest.fn(),
    getPackageById: jest.fn(),
    getPackagesByVenueId: jest.fn(),
    updateOnePackage: jest.fn(),
    deleteOnePackage: jest.fn(),
};

jest.mock("../../repositories/package.repository", () => {
    return {
        PackageRepository: jest.fn().mockImplementation(() => mockPackageRepository),
    };
});

import { PackageService } from "../../services/package.service";

describe("PackageService Unit Tests", () => {
    const service = new PackageService();

    const venueId = "507f1f77bcf86cd799439011";
    const packageId = "507f191e810c19729de860ea";

    const basePackage = {
        _id: packageId,
        venueId,
        name: "Test Package",
        images: ["old-1.png", "old-2.png"],
        pricePerPlate: 2000,
        isActive: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("createPackage", () => {
        test("should throw 400 when venueId is invalid", async () => {
            await expect(
                service.createPackage(
                    {
                        venueId: "bad-id",
                        name: "Pkg",
                        pricePerPlate: 1000,
                    } as any
                )
            ).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid venueId",
            });
        });

        test("should create package and map image filenames", async () => {
            mockPackageRepository.createPackage.mockResolvedValue({
                ...basePackage,
                images: ["img-1.png", "img-2.png"],
            });

            const result = await service.createPackage(
                {
                    venueId,
                    name: "Test Package",
                    pricePerPlate: 2200,
                    capacity: { minGuests: 20, maxGuests: 200 },
                } as any,
                [{ filename: "img-1.png" }, { filename: "img-2.png" }] as any
            );

            expect(mockPackageRepository.createPackage).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "Test Package",
                    images: ["img-1.png", "img-2.png"],
                })
            );
            expect(result.images).toEqual(["img-1.png", "img-2.png"]);
        });
    });

    describe("getAllPackages", () => {
        test("should return mapped pagination fields", async () => {
            mockPackageRepository.getAllPackages.mockResolvedValue({
                packages: [basePackage],
                totalPackages: 11,
            });

            const result = await service.getAllPackages({
                page: "2",
                size: "5",
                search: "Test",
            });

            expect(mockPackageRepository.getAllPackages).toHaveBeenCalledWith({
                page: 2,
                size: 5,
                search: "Test",
            });
            expect(result.packages).toEqual([basePackage]);
            expect(result.pagination).toEqual({
                page: 2,
                size: 5,
                totalPages: 3,
                totalItems: 11,
            });
        });
    });

    describe("getPackageById", () => {
        test("should return package when found", async () => {
            mockPackageRepository.getPackageById.mockResolvedValue(basePackage);

            const result = await service.getPackageById(packageId);
            expect(result).toEqual(basePackage);
        });

        test("should throw 404 when package is not found", async () => {
            mockPackageRepository.getPackageById.mockResolvedValue(null);

            await expect(service.getPackageById(packageId)).rejects.toMatchObject({
                statusCode: 404,
                message: "Package not found",
            });
        });
    });

    describe("getPackagesByVenueId", () => {
        test("should throw 400 for invalid venueId", async () => {
            await expect(service.getPackagesByVenueId("invalid-id")).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid venueId",
            });
        });

        test("should fetch active packages by venue", async () => {
            mockPackageRepository.getPackagesByVenueId.mockResolvedValue([basePackage]);

            const result = await service.getPackagesByVenueId(venueId);
            expect(mockPackageRepository.getPackagesByVenueId).toHaveBeenCalledWith(venueId, true);
            expect(result).toEqual([basePackage]);
        });
    });

    describe("updatePackage", () => {
        test("should throw 404 when package does not exist", async () => {
            mockPackageRepository.getPackageById.mockResolvedValue(null);

            await expect(service.updatePackage(packageId, { name: "x" } as any)).rejects.toMatchObject({
                statusCode: 404,
                message: "Package not found",
            });
        });

        test("should throw 400 for invalid venueId in update payload", async () => {
            mockPackageRepository.getPackageById.mockResolvedValue(basePackage);

            await expect(
                service.updatePackage(packageId, { venueId: "bad-id" } as any)
            ).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid venueId",
            });
        });

        test("should update package successfully", async () => {
            mockPackageRepository.getPackageById.mockResolvedValue(basePackage);
            mockPackageRepository.updateOnePackage.mockResolvedValue({
                ...basePackage,
                pricePerPlate: 3300,
            });

            const result = await service.updatePackage(packageId, { pricePerPlate: 3300 } as any);
            expect(mockPackageRepository.updateOnePackage).toHaveBeenCalledWith(
                packageId,
                expect.objectContaining({ pricePerPlate: 3300 })
            );
            expect(result.pricePerPlate).toBe(3300);
        });
    });

    describe("deletePackage", () => {
        test("should throw 404 when package does not exist", async () => {
            mockPackageRepository.getPackageById.mockResolvedValue(null);

            await expect(service.deletePackage(packageId)).rejects.toMatchObject({
                statusCode: 404,
                message: "Package not found",
            });
        });

        test("should remove old images and delete package", async () => {
            mockPackageRepository.getPackageById.mockResolvedValue(basePackage);
            mockPackageRepository.deleteOnePackage.mockResolvedValue(true);

            const existsSpy = jest.spyOn(fs, "existsSync").mockReturnValue(true);
            const unlinkSpy = jest
                .spyOn(fs.promises, "unlink")
                .mockResolvedValue(undefined as any);

            const result = await service.deletePackage(packageId);

            expect(existsSpy).toHaveBeenCalled();
            expect(unlinkSpy).toHaveBeenCalledTimes(2);
            expect(mockPackageRepository.deleteOnePackage).toHaveBeenCalledWith(packageId);
            expect(result).toBe(true);
        });
    });

    describe("replacePackageImages", () => {
        test("should throw 400 when files are missing", async () => {
            await expect(service.replacePackageImages(packageId, [])).rejects.toMatchObject({
                statusCode: 400,
                message: "Please upload at least one image",
            });
        });

        test("should throw 404 when package is not found", async () => {
            mockPackageRepository.getPackageById.mockResolvedValue(null);

            await expect(
                service.replacePackageImages(packageId, [{ filename: "new.png" }] as any)
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "Package not found",
            });
        });

        test("should delete old images and save new images", async () => {
            mockPackageRepository.getPackageById.mockResolvedValue(basePackage);
            mockPackageRepository.updateOnePackage.mockResolvedValue({
                ...basePackage,
                images: ["new-1.png", "new-2.png"],
            });

            const existsSpy = jest.spyOn(fs, "existsSync").mockReturnValue(true);
            const unlinkSpy = jest
                .spyOn(fs.promises, "unlink")
                .mockResolvedValue(undefined as any);

            const result = await service.replacePackageImages(
                packageId,
                [{ filename: "new-1.png" }, { filename: "new-2.png" }] as any
            );

            expect(existsSpy).toHaveBeenCalled();
            expect(unlinkSpy).toHaveBeenCalledTimes(2);
            expect(mockPackageRepository.updateOnePackage).toHaveBeenCalledWith(packageId, {
                images: ["new-1.png", "new-2.png"],
            });
            expect(result.images).toEqual(["new-1.png", "new-2.png"]);
        });
    });
});
