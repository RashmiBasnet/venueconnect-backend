import fs from "fs";
import { HttpError } from "../../errors/http-error";

const mockVenueRepository = {
    createVenue: jest.fn(),
    getAllVenues: jest.fn(),
    getVenueById: jest.fn(),
    updateVenue: jest.fn(),
    replaceVenueImages: jest.fn(),
};

jest.mock("../../repositories/venue.repository", () => {
    return {
        VenueRepository: jest.fn().mockImplementation(() => mockVenueRepository),
    };
});

import { VenueService } from "../../services/venue.service";

describe("VenueService Unit Tests", () => {
    const service = new VenueService();

    const baseVenue = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Venue",
        images: ["old-1.png", "old-2.png"],
        isActive: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("createVenue", () => {
        test("should create venue and map uploaded image filenames", async () => {
            mockVenueRepository.createVenue.mockResolvedValue({
                ...baseVenue,
                images: ["images-1.png", "images-2.png"],
            });

            const result = await service.createVenue(
                {
                    name: "Test Venue",
                    pricePerPlate: 1200,
                    capacity: { minGuests: 10, maxGuests: 200 },
                    address: { city: "Kathmandu", country: "Nepal" },
                } as any,
                [{ filename: "images-1.png" }, { filename: "images-2.png" }] as any
            );

            expect(mockVenueRepository.createVenue).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "Test Venue",
                    images: ["images-1.png", "images-2.png"],
                })
            );
            expect(result.images).toEqual(["images-1.png", "images-2.png"]);
        });
    });

    describe("getAllVenues", () => {
        test("should fetch only active venues", async () => {
            mockVenueRepository.getAllVenues.mockResolvedValue([baseVenue]);

            const result = await service.getAllVenues();
            expect(mockVenueRepository.getAllVenues).toHaveBeenCalledWith({ isActive: true });
            expect(result).toEqual([baseVenue]);
        });
    });

    describe("getVenueById", () => {
        test("should return venue when found", async () => {
            mockVenueRepository.getVenueById.mockResolvedValue(baseVenue);

            const result = await service.getVenueById(baseVenue._id);
            expect(result).toEqual(baseVenue);
        });

        test("should throw 404 when venue is missing", async () => {
            mockVenueRepository.getVenueById.mockResolvedValue(null);

            await expect(service.getVenueById(baseVenue._id)).rejects.toMatchObject({
                statusCode: 404,
                message: "Venue not found",
            });
        });
    });

    describe("updateVenue", () => {
        test("should update venue successfully", async () => {
            mockVenueRepository.updateVenue.mockResolvedValue({
                ...baseVenue,
                name: "Updated Venue",
            });

            const result = await service.updateVenue(baseVenue._id, { name: "Updated Venue" } as any);
            expect(mockVenueRepository.updateVenue).toHaveBeenCalledWith(baseVenue._id, {
                name: "Updated Venue",
            });
            expect(result.name).toBe("Updated Venue");
        });

        test("should throw 404 when venue to update is missing", async () => {
            mockVenueRepository.updateVenue.mockResolvedValue(null);

            await expect(service.updateVenue(baseVenue._id, { name: "x" } as any)).rejects.toMatchObject({
                statusCode: 404,
                message: "Venue not found",
            });
        });
    });

    describe("replaceVenueImages", () => {
        test("should throw 400 when no files are provided", async () => {
            await expect(service.replaceVenueImages(baseVenue._id, [])).rejects.toMatchObject({
                statusCode: 400,
                message: "Please upload at least one image",
            });
        });

        test("should throw 404 when venue is missing", async () => {
            mockVenueRepository.getVenueById.mockResolvedValue(null);

            await expect(
                service.replaceVenueImages(baseVenue._id, [{ filename: "new.png" }] as any)
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "Venue not found",
            });
        });

        test("should remove old files and replace with new image names", async () => {
            mockVenueRepository.getVenueById.mockResolvedValue(baseVenue);
            mockVenueRepository.replaceVenueImages.mockResolvedValue({
                ...baseVenue,
                images: ["new-1.png", "new-2.png"],
            });

            const existsSpy = jest.spyOn(fs, "existsSync").mockReturnValue(true);
            const unlinkSpy = jest
                .spyOn(fs.promises, "unlink")
                .mockResolvedValue(undefined as any);

            const result = await service.replaceVenueImages(
                baseVenue._id,
                [{ filename: "new-1.png" }, { filename: "new-2.png" }] as any
            );

            expect(existsSpy).toHaveBeenCalled();
            expect(unlinkSpy).toHaveBeenCalledTimes(2);
            expect(mockVenueRepository.replaceVenueImages).toHaveBeenCalledWith(baseVenue._id, [
                "new-1.png",
                "new-2.png",
            ]);
            expect(result.images).toEqual(["new-1.png", "new-2.png"]);
        });
    });

    test("HttpError shape remains consistent", () => {
        const error = new HttpError(418, "test");
        expect(error.statusCode).toBe(418);
        expect(error.message).toBe("test");
    });
});
