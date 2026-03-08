import request from "supertest";
import app from "../../app";
import { UserModel } from "../../models/user.model";
import { VenueModel } from "../../models/venue.model";
import { PackageModel } from "../../models/package.model";
import { BookingModel } from "../../models/booking.model";
import fs from "fs";
import path from "path";

describe("Booking Integration Tests", () => {
    const adminCreds = {
        fullName: "Booking Admin",
        email: "booking-admin@email.com",
        password: "admin123",
        confirmPassword: "admin123",
    };

    const userCreds = {
        fullName: "Booking User",
        email: "booking-user@email.com",
        password: "user1234",
        confirmPassword: "user1234",
    };

    const secondUserCreds = {
        fullName: "Booking User 2",
        email: "booking-user-2@email.com",
        password: "user5678",
        confirmPassword: "user5678",
    };

    let adminToken = "";
    let userToken = "";
    let secondUserToken = "";
    let venueId = "";
    let packageId = "";
    let bookingId = "";

    beforeAll(async () => {
        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        await UserModel.deleteMany({
            email: {
                $in: [adminCreds.email, userCreds.email, secondUserCreds.email],
            },
        });
        await BookingModel.deleteMany({
            contactEmail: {
                $in: ["booking-user@email.com", "booking-user-2@email.com"],
            },
        });
        await PackageModel.deleteMany({ name: "Booking Test Package" });
        await VenueModel.deleteMany({ name: "Booking Test Venue" });

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

        await request(app).post("/api/auth/register").send(secondUserCreds);
        const secondUserLogin = await request(app).post("/api/auth/login").send({
            email: secondUserCreds.email,
            password: secondUserCreds.password,
        });
        secondUserToken = secondUserLogin.body.token;

        const venue = await VenueModel.create({
            name: "Booking Test Venue",
            description: "Venue for booking tests",
            address: { city: "Kathmandu", country: "Nepal" },
            pricePerPlate: 1800,
            capacity: { minGuests: 20, maxGuests: 500 },
            isActive: true,
        });
        venueId = venue._id.toString();

        const pkg = await PackageModel.create({
            venueId: venue._id,
            name: "Booking Test Package",
            pricePerPlate: 2500,
            capacity: { minGuests: 20, maxGuests: 350 },
            inclusions: ["Food", "Sound"],
            isActive: true,
        });
        packageId = pkg._id.toString();
    });

    afterAll(async () => {
        await UserModel.deleteMany({
            email: {
                $in: [adminCreds.email, userCreds.email, secondUserCreds.email],
            },
        });
        await BookingModel.deleteMany({
            contactEmail: {
                $in: ["booking-user@email.com", "booking-user-2@email.com"],
            },
        });
        await PackageModel.deleteMany({ name: "Booking Test Package" });
        await VenueModel.deleteMany({ name: "Booking Test Venue" });
    });

    describe("POST /api/booking", () => {
        test("should block create booking without token", async () => {
            const res = await request(app).post("/api/booking").send({
                venueId,
                eventDate: "2027-01-10",
                startTime: "10:00",
                endTime: "12:00",
                guests: 100,
                contactName: "Booker",
                contactPhone: "9800000000",
                contactEmail: "booking-user@email.com",
            });

            expect([401, 403]).toContain(res.status);
        });

        test("user should create booking successfully", async () => {
            const res = await request(app)
                .post("/api/booking")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    venueId,
                    packageId,
                    eventDate: "2027-01-10",
                    startTime: "10:00",
                    endTime: "12:00",
                    guests: 120,
                    contactName: "Booking User",
                    contactPhone: "9800000000",
                    contactEmail: "booking-user@email.com",
                    note: "Need projector",
                    extras: ["Live Music"],
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Booking created successfully");
            expect(res.body).toHaveProperty("data");
            expect(res.body.data).toHaveProperty("_id");
            expect(res.body.data).toHaveProperty("status", "pending");
            expect(res.body.data).toHaveProperty("paymentStatus", "unpaid");
            expect(res.body.data).toHaveProperty("totalPrice", 2500 * 120);

            bookingId = res.body.data._id;
        });

        test("should reject booking with overlapping time", async () => {
            const res = await request(app)
                .post("/api/booking")
                .set("Authorization", `Bearer ${secondUserToken}`)
                .send({
                    venueId,
                    eventDate: "2027-01-10",
                    startTime: "11:00",
                    endTime: "13:00",
                    guests: 60,
                    contactName: "Booking User 2",
                    contactPhone: "9800000001",
                    contactEmail: "booking-user-2@email.com",
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty(
                "message",
                "This venue is already booked for the selected time"
            );
        });

        test("should reject invalid time range", async () => {
            const res = await request(app)
                .post("/api/booking")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    venueId,
                    eventDate: "2027-01-11",
                    startTime: "15:00",
                    endTime: "14:00",
                    guests: 60,
                    contactName: "Booking User",
                    contactPhone: "9800000000",
                    contactEmail: "booking-user@email.com",
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("success", false);
        });
    });

    describe("GET /api/booking/me and /api/booking/:id", () => {
        test("should return current user's bookings", async () => {
            const res = await request(app)
                .get("/api/booking/me")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "My bookings fetched successfully");
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        test("owner should fetch own booking by id", async () => {
            const res = await request(app)
                .get(`/api/booking/${bookingId}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Booking fetched successfully");
            expect(res.body.data).toHaveProperty("_id", bookingId);
        });

        test("another user should not fetch someone else's booking", async () => {
            const res = await request(app)
                .get(`/api/booking/${bookingId}`)
                .set("Authorization", `Bearer ${secondUserToken}`);

            expect(res.status).toBe(403);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "You are not allowed to view this booking");
        });
    });

    describe("Admin booking endpoints", () => {
        test("admin should fetch all bookings with pagination", async () => {
            const res = await request(app)
                .get("/api/admin/booking?page=1&size=10")
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Bookings fetched successfully");
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty("pagination");
            expect(res.body.pagination).toHaveProperty("page", 1);
            expect(res.body.pagination).toHaveProperty("size", 10);
            expect(res.body.pagination).toHaveProperty("totalPages");
            expect(res.body.pagination).toHaveProperty("totalItems");
        });

        test("admin should update booking status", async () => {
            const res = await request(app)
                .patch(`/api/admin/booking/${bookingId}/status`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ status: "confirmed" });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Booking status updated successfully");
            expect(res.body.data).toHaveProperty("status", "confirmed");
        });

        test("admin should update payment status", async () => {
            const res = await request(app)
                .patch(`/api/admin/booking/${bookingId}/payment-status`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ paymentStatus: "paid" });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Payment status updated successfully");
            expect(res.body.data).toHaveProperty("paymentStatus", "paid");
        });
    });
});
