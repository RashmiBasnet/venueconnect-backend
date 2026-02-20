import request from "supertest";
import app from "../../app";
import { UserModel } from "../../models/user.model";
import fs from "fs";
import path from "path";

describe("Admin Users Integration Tests", () => {
    const adminCreds = {
        fullName: "Admin Test",
        email: "admin-test@email.com",
        password: "admin123",
        confirmPassword: "admin123",
    };

    const normalUserCreds = {
        fullName: "Normal User",
        email: "normal-user@email.com",
        password: "user1234",
        confirmPassword: "user1234",
    };

    const userToCreate = {
        fullName: "Created By Admin",
        email: "created-by-admin@email.com",
        password: "created123",
        confirmPassword: "created123",
    };

    let adminToken = "";
    let userToken = "";
    let createdUserId = "";

    beforeAll(async () => {
        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        await UserModel.deleteMany({
            email: { $in: [adminCreds.email, normalUserCreds.email, userToCreate.email] },
        });

        await request(app).post("/api/auth/register").send(adminCreds);

        await UserModel.updateOne({ email: adminCreds.email }, { $set: { role: "admin" } });

        // login admin
        const adminLogin = await request(app).post("/api/auth/login").send({
            email: adminCreds.email,
            password: adminCreds.password,
        });
        adminToken = adminLogin.body.token;

        // register normal user
        await request(app).post("/api/auth/register").send(normalUserCreds);

        // login normal user
        const userLogin = await request(app).post("/api/auth/login").send({
            email: normalUserCreds.email,
            password: normalUserCreds.password,
        });
        userToken = userLogin.body.token;
    });

    afterAll(async () => {
        await UserModel.deleteMany({
            email: { $in: [adminCreds.email, normalUserCreds.email, userToCreate.email] },
        });
    });

    describe("Auth guards for /api/admin/users", () => {
        test("Should block requests without token", async () => {
            const res = await request(app).get("/api/admin/users");
            expect([401, 403]).toContain(res.status);
        });

        test("Should block normal user (not admin)", async () => {
            const res = await request(app)
                .get("/api/admin/users")
                .set("Authorization", `Bearer ${userToken}`);

            expect([401, 403]).toContain(res.status);
        });
    });

    describe("POST /api/admin/users", () => {
        test("Admin should create a user", async () => {
            const res = await request(app)
                .post("/api/admin/users")
                .set("Authorization", `Bearer ${adminToken}`)
                .send(userToCreate);

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "User Created");
            expect(res.body).toHaveProperty("data");
            expect(res.body.data).toHaveProperty("_id");
            expect(res.body.data).toHaveProperty("email", userToCreate.email);

            createdUserId = res.body.data._id;
        });

        test("Admin should fail to create user with existing email", async () => {
            const res = await request(app)
                .post("/api/admin/users")
                .set("Authorization", `Bearer ${adminToken}`)
                .send(userToCreate);

            expect(res.status).toBe(403);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Email already in use");
        });

        test("Should fail validation (bad email)", async () => {
            const res = await request(app)
                .post("/api/admin/users")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    fullName: "Bad Email",
                    email: "not-an-email",
                    password: "pass123",
                    confirmPassword: "pass123",
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message");
        });
    });

    describe("GET /api/admin/users", () => {
        test("Admin should get all users (with pagination)", async () => {
            const res = await request(app)
                .get("/api/admin/users?page=1&size=10")
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "All Users Retrieved");
            expect(res.body).toHaveProperty("data");
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty("pagination");
            expect(res.body.pagination).toHaveProperty("page", 1);
            expect(res.body.pagination).toHaveProperty("size", 10);
            expect(res.body.pagination).toHaveProperty("total");
            expect(res.body.pagination).toHaveProperty("totalPages");
        });

        test("Admin should search users", async () => {
            const res = await request(app)
                .get(`/api/admin/users?search=${encodeURIComponent("Created By Admin")}`)
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe("GET /api/admin/users/:id", () => {
        test("Admin should get single user by id", async () => {
            const res = await request(app)
                .get(`/api/admin/users/${createdUserId}`)
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "Single User Retrieved");
            expect(res.body).toHaveProperty("data");
            expect(res.body.data).toHaveProperty("_id", createdUserId);
        });

        test("Should return 404 for non-existing user", async () => {
            const fakeId = "507f1f77bcf86cd799439011";
            const res = await request(app)
                .get(`/api/admin/users/${fakeId}`)
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "User not found");
        });
    });

    describe("PUT /api/admin/users/:id", () => {
        test("Admin should update user fullName", async () => {
            const res = await request(app)
                .put(`/api/admin/users/${createdUserId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ fullName: "Updated By Admin" });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "User Updated");
            expect(res.body).toHaveProperty("data");
            expect(res.body.data).toHaveProperty("fullName", "Updated By Admin");
        });

        test("Admin should update user with image upload (optional)", async () => {
            const fakePng = Buffer.from([
                0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
                0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                0x08, 0x06, 0x00, 0x00, 0x00,
            ]);

            const res = await request(app)
                .put(`/api/admin/users/${createdUserId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .attach("image", fakePng, { filename: "admin-avatar.png", contentType: "image/png" });

            expect([200, 400]).toContain(res.status);

            if (res.status === 200) {
                expect(res.body).toHaveProperty("success", true);
                expect(res.body).toHaveProperty("message", "User Updated");
            }
        });

        test("Should return 404 when updating non-existing user", async () => {
            const fakeId = "507f1f77bcf86cd799439011";
            const res = await request(app)
                .put(`/api/admin/users/${fakeId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ fullName: "Does Not Exist" });

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "User not found");
        });
    });

    describe("DELETE /api/admin/users/:id", () => {
        test("Admin should delete user", async () => {
            const res = await request(app)
                .delete(`/api/admin/users/${createdUserId}`)
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("message", "User Deleted");
        });

        test("Should return 404 when deleting already deleted user", async () => {
            const res = await request(app)
                .delete(`/api/admin/users/${createdUserId}`)
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "User not found");
        });
    });
});
