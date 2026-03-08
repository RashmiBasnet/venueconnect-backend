import request from "supertest";
import app from "../../app";
import { UserModel } from "../../models/user.model";
import { VenueModel } from "../../models/venue.model";
import fs from "fs";
import path from "path";

describe("Venue Integration Tests", () => {
    const adminCreds = {
        fullName: "Venue Admin",
        email: "venue-admin@email.com",
        password: "admin123",
        confirmPassword: "admin123",
    };

    const userCreds = {
        fullName: "Venue User",
        email: "venue-user@email.com",
        password: "user1234",
        confirmPassword: "user1234",
    };

    let adminToken = "";
    let userToken = "";
    let createdVenueId = "";

    beforeAll(async () => {
        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        await UserModel.deleteMany({ email: { $in: [adminCreds.email, userCreds.email] } });
        await VenueModel.deleteMany({
            name: { $in: ["Venue Active Public", "Venue Inactive Hidden", "Created Venue"] },
        });

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

        await VenueModel.create({
            name: "Venue Active Public",
            description: "Visible venue",
            address: { city: "Kathmandu", country: "Nepal" },
            pricePerPlate: 2000,
            capacity: { minGuests: 10, maxGuests: 500 },
            amenities: ["Parking"],
            isActive: true,
        });

        await VenueModel.create({
            name: "Venue Inactive Hidden",
            description: "Should not show in public list",
            address: { city: "Kathmandu", country: "Nepal" },
            pricePerPlate: 1800,
            capacity: { minGuests: 10, maxGuests: 350 },
            amenities: ["WiFi"],
            isActive: false,
        });
    });

    afterAll(async () => {
        await UserModel.deleteMany({ email: { $in: [adminCreds.email, userCreds.email] } });
        await VenueModel.deleteMany({
            name: { $in: ["Venue Active Public", "Venue Inactive Hidden", "Created Venue"] },
        });
    });

    describe("GET /api/venues", () => {
        test("Should return only active venues", async () => {
            const res = await request(app).get("/api/venues");

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);

            const names = res.body.data.map((v: { name: string }) => v.name);
            expect(names).toContain("Venue Active Public");
            expect(names).not.toContain("Venue Inactive Hidden");
        });
    });

    describe("GET /api/venues/:id", () => {
        test("Should fetch a venue by id", async () => {
            const venue = await VenueModel.findOne({ name: "Venue Active Public" });
            const res = await request(app).get(`/api/venues/${venue!._id.toString()}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("data");
            expect(res.body.data).toHaveProperty("name", "Venue Active Public");
        });

        test("Should return 404 when venue is not found", async () => {
            const res = await request(app).get("/api/venues/507f1f77bcf86cd799439011");
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Venue not found");
        });
    });

    describe("POST /api/admin/venues", () => {
        test("Should block create venue without token", async () => {
            const res = await request(app).post("/api/admin/venues").send({
                name: "Created Venue",
                pricePerPlate: 2500,
                capacity: { minGuests: 20, maxGuests: 300 },
                address: { city: "Kathmandu", country: "Nepal" },
            });

            expect([401, 403]).toContain(res.status);
        });

        test("Should block normal user from create venue", async () => {
            const res = await request(app)
                .post("/api/admin/venues")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    name: "Created Venue",
                    pricePerPlate: 2500,
                    capacity: { minGuests: 20, maxGuests: 300 },
                    address: { city: "Kathmandu", country: "Nepal" },
                });

            expect(res.status).toBe(403);
            expect(res.body).toHaveProperty("success", false);
        });

        test("Admin should create venue successfully", async () => {
            const res = await request(app)
                .post("/api/admin/venues")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    name: "Created Venue",
                    description: "Admin created venue",
                    pricePerPlate: 2500,
                    capacity: { minGuests: 20, maxGuests: 300 },
                    amenities: ["Projector", "Parking"],
                    address: { area: "Baneshwor", city: "Kathmandu", country: "Nepal" },
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Venue created successfully");
            expect(res.body).toHaveProperty("data");
            expect(res.body.data).toHaveProperty("_id");
            expect(res.body.data).toHaveProperty("name", "Created Venue");

            createdVenueId = res.body.data._id;
        });
    });

    describe("PUT /api/admin/venues/:id", () => {
        test("Admin should update venue", async () => {
            const res = await request(app)
                .put(`/api/admin/venues/${createdVenueId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    name: "Created Venue",
                    pricePerPlate: 3200,
                    capacity: { minGuests: 20, maxGuests: 350 },
                    address: { city: "Kathmandu", country: "Nepal" },
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Venue updated successfully");
            expect(res.body.data).toHaveProperty("pricePerPlate", 3200);
        });

        test("Should return 404 for non-existing venue update", async () => {
            const res = await request(app)
                .put("/api/admin/venues/507f1f77bcf86cd799439011")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    name: "Does Not Exist",
                    pricePerPlate: 1200,
                    capacity: { minGuests: 10, maxGuests: 100 },
                    address: { city: "Kathmandu", country: "Nepal" },
                });

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Venue not found");
        });
    });

    describe("PUT /api/admin/venues/:id/images", () => {
        test("Should fail when no image files are uploaded", async () => {
            const res = await request(app)
                .put(`/api/admin/venues/${createdVenueId}/images`)
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Please upload at least one image");
        });

        test("Admin should replace venue images", async () => {
            const fakePng = Buffer.from([
                0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
                0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                0x08, 0x06, 0x00, 0x00, 0x00,
            ]);

            const res = await request(app)
                .put(`/api/admin/venues/${createdVenueId}/images`)
                .set("Authorization", `Bearer ${adminToken}`)
                .attach("images", fakePng, {
                    filename: "venue-1.png",
                    contentType: "image/png",
                })
                .attach("images", fakePng, {
                    filename: "venue-2.png",
                    contentType: "image/png",
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Venue images updated successfully");
            expect(res.body).toHaveProperty("data");
            expect(Array.isArray(res.body.data.images)).toBe(true);
            expect(res.body.data.images.length).toBe(2);
        });
    });
});
