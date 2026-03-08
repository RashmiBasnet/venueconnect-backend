import request from "supertest";
import app from "../../app";
import { UserModel } from "../../models/user.model";
import { VenueModel } from "../../models/venue.model";
import { PackageModel } from "../../models/package.model";
import fs from "fs";
import path from "path";

describe("Package Integration Tests", () => {
    const adminCreds = {
        fullName: "Package Admin",
        email: "package-admin@email.com",
        password: "admin123",
        confirmPassword: "admin123",
    };

    const userCreds = {
        fullName: "Package User",
        email: "package-user@email.com",
        password: "user1234",
        confirmPassword: "user1234",
    };

    let adminToken = "";
    let userToken = "";
    let venueId = "";
    let createdPackageId = "";

    beforeAll(async () => {
        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        await UserModel.deleteMany({ email: { $in: [adminCreds.email, userCreds.email] } });
        await PackageModel.deleteMany({
            name: {
                $in: ["Package Active Seed", "Package Hidden Seed", "Created Package"],
            },
        });
        await VenueModel.deleteMany({ name: "Package Test Venue" });

        await request(app).post("/api/auth/register").send(adminCreds);
        await UserModel.updateOne({ email: adminCreds.email }, { $set: { role: "admin" } });
        const adminLogin = await request(app).post("/api/auth/login").send({
            email: adminCreds.email,
            password: adminCreds.password,
        });
        adminToken = adminLogin.body.token;

        await request(app).post("/api/auth/register").send(userCreds);
        const userLogin = await request(app).post("/api/auth/login").send({
            email: userCreds.email,
            password: userCreds.password,
        });
        userToken = userLogin.body.token;

        const venue = await VenueModel.create({
            name: "Package Test Venue",
            description: "Venue for package tests",
            address: { city: "Kathmandu", country: "Nepal" },
            pricePerPlate: 2000,
            capacity: { minGuests: 10, maxGuests: 400 },
            isActive: true,
        });
        venueId = venue._id.toString();

        await PackageModel.create({
            venueId: venue._id,
            name: "Package Active Seed",
            description: "Visible package",
            pricePerPlate: 2100,
            capacity: { minGuests: 20, maxGuests: 300 },
            inclusions: ["Food"],
            isActive: true,
        });

        await PackageModel.create({
            venueId: venue._id,
            name: "Package Hidden Seed",
            description: "Hidden package",
            pricePerPlate: 1500,
            capacity: { minGuests: 10, maxGuests: 150 },
            inclusions: ["Drinks"],
            isActive: false,
        });
    });

    afterAll(async () => {
        await UserModel.deleteMany({ email: { $in: [adminCreds.email, userCreds.email] } });
        await PackageModel.deleteMany({
            name: {
                $in: ["Package Active Seed", "Package Hidden Seed", "Created Package"],
            },
        });
        await VenueModel.deleteMany({ name: "Package Test Venue" });
    });

    describe("GET /api/packages", () => {
        test("Should return packages with pagination metadata", async () => {
            const res = await request(app).get("/api/packages?page=1&size=10");

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Packages fetched successfully");
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty("pagination");
            expect(res.body.pagination).toHaveProperty("page", 1);
            expect(res.body.pagination).toHaveProperty("size", 10);
            expect(res.body.pagination).toHaveProperty("totalPages");
            expect(res.body.pagination).toHaveProperty("totalItems");
        });
    });

    describe("GET /api/packages/venue/:venueId", () => {
        test("Should return only active packages by venue", async () => {
            const res = await request(app).get(`/api/packages/venue/${venueId}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Packages fetched successfully");
            expect(Array.isArray(res.body.data)).toBe(true);

            const names = res.body.data.map((p: { name: string }) => p.name);
            expect(names).toContain("Package Active Seed");
            expect(names).not.toContain("Package Hidden Seed");
        });

        test("Should return 400 for invalid venueId", async () => {
            const res = await request(app).get("/api/packages/venue/not-valid-id");
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Invalid venueId");
        });
    });

    describe("GET /api/packages/:id", () => {
        test("Should fetch package by id", async () => {
            const seed = await PackageModel.findOne({ name: "Package Active Seed" });
            const res = await request(app).get(`/api/packages/${seed!._id.toString()}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Package fetched successfully");
            expect(res.body).toHaveProperty("data");
            expect(res.body.data).toHaveProperty("name", "Package Active Seed");
        });

        test("Should return 404 when package is not found", async () => {
            const res = await request(app).get("/api/packages/507f1f77bcf86cd799439011");
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Package not found");
        });
    });

    describe("POST /api/admin/packages", () => {
        test("Should block package create without token", async () => {
            const res = await request(app).post("/api/admin/packages").send({
                venueId,
                name: "Created Package",
                pricePerPlate: 3000,
            });

            expect([401, 403]).toContain(res.status);
        });

        test("Should block normal user from package create", async () => {
            const res = await request(app)
                .post("/api/admin/packages")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    venueId,
                    name: "Created Package",
                    pricePerPlate: 3000,
                });

            expect(res.status).toBe(403);
            expect(res.body).toHaveProperty("success", false);
        });

        test("Should fail create for invalid venueId", async () => {
            const res = await request(app)
                .post("/api/admin/packages")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    venueId: "bad-id",
                    name: "Created Package",
                    pricePerPlate: 3000,
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Invalid venueId");
        });

        test("Admin should create package successfully", async () => {
            const res = await request(app)
                .post("/api/admin/packages")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    venueId,
                    name: "Created Package",
                    description: "Admin created package",
                    pricePerPlate: 3000,
                    capacity: { minGuests: 50, maxGuests: 350 },
                    inclusions: ["Decoration", "Sound"],
                    isActive: true,
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Package created successfully");
            expect(res.body).toHaveProperty("data");
            expect(res.body.data).toHaveProperty("_id");
            expect(res.body.data).toHaveProperty("name", "Created Package");

            createdPackageId = res.body.data._id;
        });
    });

    describe("PUT /api/admin/packages/:id", () => {
        test("Admin should update package", async () => {
            const res = await request(app)
                .put(`/api/admin/packages/${createdPackageId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    pricePerPlate: 3300,
                    capacity: { minGuests: 60, maxGuests: 360 },
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Package updated successfully");
            expect(res.body.data).toHaveProperty("pricePerPlate", 3300);
        });

        test("Should return 404 on update for non-existing package", async () => {
            const res = await request(app)
                .put("/api/admin/packages/507f1f77bcf86cd799439011")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ pricePerPlate: 1000 });

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Package not found");
        });
    });

    describe("PUT /api/admin/packages/:id/images", () => {
        test("Should fail if no files are uploaded", async () => {
            const res = await request(app)
                .put(`/api/admin/packages/${createdPackageId}/images`)
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Please upload at least one image");
        });

        test("Admin should replace package images", async () => {
            const fakePng = Buffer.from([
                0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
                0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                0x08, 0x06, 0x00, 0x00, 0x00,
            ]);

            const res = await request(app)
                .put(`/api/admin/packages/${createdPackageId}/images`)
                .set("Authorization", `Bearer ${adminToken}`)
                .attach("images", fakePng, {
                    filename: "package-1.png",
                    contentType: "image/png",
                })
                .attach("images", fakePng, {
                    filename: "package-2.png",
                    contentType: "image/png",
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Package images updated successfully");
            expect(res.body).toHaveProperty("data");
            expect(Array.isArray(res.body.data.images)).toBe(true);
            expect(res.body.data.images.length).toBe(2);
        });
    });

    describe("DELETE /api/admin/packages/:id", () => {
        test("Admin should delete package", async () => {
            const res = await request(app)
                .delete(`/api/admin/packages/${createdPackageId}`)
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Package deleted successfully");
        });

        test("Should return 404 when deleting already deleted package", async () => {
            const res = await request(app)
                .delete(`/api/admin/packages/${createdPackageId}`)
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Package not found");
        });
    });
});
