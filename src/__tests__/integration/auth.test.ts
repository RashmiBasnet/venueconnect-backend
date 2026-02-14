import request from "supertest";
import app from "../../app";
import { UserModel } from "../../models/user.model";

describe("Authentication Integration Tests", () => {
    const testUser = {
        fullName: "Test User",
        email: "test@email.com",
        password: "test123",
        confirmPassword: "test123",
    };

    const wrongConfirm = {
        ...testUser,
        email: "mismatch@email.com",
        confirmPassword: "different123",
    };

    beforeAll(async () => {
        await UserModel.deleteMany({ email: { $in: [testUser.email, wrongConfirm.email] } });
    });

    afterAll(async () => {
        await UserModel.deleteMany({ email: { $in: [testUser.email, wrongConfirm.email] } });
    });

    describe("POST /api/auth/register", () => {
        test("Should register a new user successfully", async () => {
            const res = await request(app).post("/api/auth/register").send(testUser);

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("data");

            // basic shape checks (avoid checking hashed password exactly)
            expect(res.body.data).toHaveProperty("_id");
            expect(res.body.data).toHaveProperty("email", testUser.email);
            expect(res.body.data).toHaveProperty("fullName", testUser.fullName);
            expect(res.body.data).toHaveProperty("role", "user");
        });

        test("Should fail to register a user with existing email", async () => {
            const res = await request(app).post("/api/auth/register").send(testUser);

            expect(res.status).toBe(403);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Email is already in use");
        });

        test("Should fail when confirmPassword does not match", async () => {
            const res = await request(app).post("/api/auth/register").send(wrongConfirm);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("success", false);
            // Your controller returns: { errors: z.prettifyError(...) }
            expect(res.body).toHaveProperty("errors");
        });

        test("Should fail when password is too short", async () => {
            const res = await request(app).post("/api/auth/register").send({
                fullName: "Short Pass",
                email: "shortpass@email.com",
                password: "123",
                confirmPassword: "123",
            });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("errors");
            await UserModel.deleteMany({ email: "shortpass@email.com" });
        });
    });

    describe("POST /api/auth/login", () => {
        test("Should login successfully with correct credentials", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: testUser.email,
                password: testUser.password,
            });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("token");
            expect(res.body).toHaveProperty("data");
            expect(res.body).toHaveProperty("message", "Login Success");
            expect(res.body.data).toHaveProperty("email", testUser.email);
        });

        test("Should fail login with wrong password", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: testUser.email,
                password: "wrongpassword",
            });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "Invalid credentials");
        });

        test("Should fail login when user not found", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: "nouser@email.com",
                password: "test123",
            });

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body).toHaveProperty("message", "User not found");
        });
    });
});
