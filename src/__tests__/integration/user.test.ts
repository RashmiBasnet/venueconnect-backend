import request from "supertest";
import app from "../../app";
import { UserModel } from "../../models/user.model";
import fs from "fs";
import path from "path";

jest.mock("../../config/email", () => ({
    sendEmail: jest.fn(async (_to: string, _subject: string, _html: string) => true),
}));

import { sendEmail } from "../../config/email";

describe("User Integration Tests", () => {
    const testUser = {
        fullName: "User Test",
        email: "user-test@email.com",
        password: "test123",
        confirmPassword: "test123",
    };

    let token = "";

    beforeAll(async () => {
        process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

        await UserModel.deleteMany({ email: testUser.email });

        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        // register
        await request(app).post("/api/auth/register").send(testUser);

        // login to get JWT
        const loginRes = await request(app).post("/api/auth/login").send({
            email: testUser.email,
            password: testUser.password,
        });

        token = loginRes.body.token;
    });

    afterAll(async () => {
        await UserModel.deleteMany({ email: testUser.email });
        jest.clearAllMocks();
    });

    describe("GET /api/user/profile", () => {
        test("Should fail if no token provided", async () => {
            const res = await request(app).get("/api/user/profile");
            expect([401, 403]).toContain(res.status);
        });

        test("Should fetch profile with valid token", async () => {
            const res = await request(app)
                .get("/api/user/profile")
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("data");
            expect(res.body.data).toHaveProperty("email", testUser.email);
            expect(res.body).toHaveProperty("message", "User profile fetched successfully");
        });
    });

    describe("PUT /api/user/update-profile", () => {
        test("Should update fullName successfully", async () => {
            const res = await request(app)
                .put("/api/user/update-profile")
                .set("Authorization", `Bearer ${token}`)
                .send({ fullName: "Updated Name" });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("data");
            expect(res.body.data).toHaveProperty("fullName", "Updated Name");
            expect(res.body).toHaveProperty("message", "User Profile updated sucessfully");
        });

        test("Should fail update when invalid email", async () => {
            const res = await request(app)
                .put("/api/user/update-profile")
                .set("Authorization", `Bearer ${token}`)
                .send({ email: "not-an-email" });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message");
        });
    });

    describe("PUT /api/user/profile/upload", () => {
        test("Should upload profile picture with valid token + file", async () => {
            const fakePng = Buffer.from([
                0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
                0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
                0x08, 0x06, 0x00, 0x00, 0x00,
            ]);

            const res = await request(app)
                .put("/api/user/profile/upload")
                .set("Authorization", `Bearer ${token}`)
                .attach("profile", fakePng, {
                    filename: "avatar.png",
                    contentType: "image/png",
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("data");
            expect(res.body.data).toHaveProperty("profilePicture");
            expect(typeof res.body.data.profilePicture).toBe("string");
            expect(res.body).toHaveProperty("message", "Profile picture uploaded successfully");
        });

        test("Should fail upload when no file provided", async () => {
            const res = await request(app)
                .put("/api/user/profile/upload")
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Please upload a file");
        });
    });

    describe("POST /api/user/request-password-reset + POST /api/user/reset-password/:token", () => {
        test("Should request password reset and call sendEmail", async () => {
            const res = await request(app)
                .post("/api/user/request-password-reset")
                .send({ email: testUser.email });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty(
                "message",
                "If the email is registered, a password reset link has been sent."
            );

            expect(sendEmail).toHaveBeenCalled();

            const mockCalls = (sendEmail as jest.Mock).mock.calls;
            const lastCall = mockCalls[mockCalls.length - 1];
            const html = lastCall?.[2] as string;

            expect(typeof html).toBe("string");

            // extract token from link 
            const match = html.match(/token=([A-Za-z0-9._-]+)/);
            expect(match).not.toBeNull();

            const resetToken = match![1];

            const resetRes = await request(app)
                .post(`/api/user/reset-password/${resetToken}`)
                .send({ newPassword: "newpass123" });

            expect(resetRes.status).toBe(200);
            expect(resetRes.body).toHaveProperty("success", true);
            expect(resetRes.body).toHaveProperty("message", "Password has been reset successfully.");

            // verification that you can now login with new password
            const loginRes = await request(app).post("/api/auth/login").send({
                email: testUser.email,
                password: "newpass123",
            });

            expect(loginRes.status).toBe(201);
            expect(loginRes.body).toHaveProperty("success", true);
            expect(loginRes.body).toHaveProperty("token");
        });

        test("Should fail reset password with invalid token", async () => {
            const res = await request(app)
                .post("/api/user/reset-password/invalidtoken123")
                .send({ newPassword: "newpass123" });

            expect([400, 401]).toContain(res.status);
            expect(res.body).toHaveProperty("success", false);
            expect(typeof res.body.message).toBe("string");
        });
    });
});
