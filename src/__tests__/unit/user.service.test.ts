import { HttpError } from "../../errors/http-error";

const mockUserRepository = {
    createUser: jest.fn(),
    getUserByEmail: jest.fn(),
    getUserById: jest.fn(),
    updateOneUser: jest.fn(),
    uploadProfilePicture: jest.fn(),
};

jest.mock("../../repositories/user.repository", () => {
    return {
        UserRepository: jest.fn().mockImplementation(() => mockUserRepository),
    };
});

jest.mock("bcryptjs", () => ({
    __esModule: true,
    default: {
        hash: jest.fn(),
        compare: jest.fn(),
    },
}));

jest.mock("jsonwebtoken", () => ({
    __esModule: true,
    default: {
        sign: jest.fn(),
        verify: jest.fn(),
    },
}));

jest.mock("../../config/email", () => ({
    sendEmail: jest.fn(),
}));

import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import { sendEmail } from "../../config/email";
import { UserService } from "../../services/user.service";

describe("UserService Unit Tests", () => {
    const service = new UserService();

    const baseUser = {
        _id: "507f1f77bcf86cd799439011",
        fullName: "Test User",
        email: "test@email.com",
        password: "hashed-password",
        role: "user",
        profilePicture: "old-avatar.png",
    };

    const mockedBcrypt = bcryptjs as unknown as {
        hash: jest.Mock;
        compare: jest.Mock;
    };

    const mockedJwt = jwt as unknown as {
        sign: jest.Mock;
        verify: jest.Mock;
    };

    const mockedSendEmail = sendEmail as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("registerUser", () => {
        test("should register user when email is not taken", async () => {
            mockUserRepository.getUserByEmail.mockResolvedValue(null);
            mockedBcrypt.hash.mockResolvedValue("hashed-new-password");
            mockUserRepository.createUser.mockResolvedValue({
                ...baseUser,
                password: "hashed-new-password",
            });

            const data = {
                fullName: "Test User",
                email: "test@email.com",
                password: "plain-pass",
                confirmPassword: "plain-pass",
            };

            const result = await service.registerUser(data as any);

            expect(mockUserRepository.getUserByEmail).toHaveBeenCalledWith("test@email.com");
            expect(mockedBcrypt.hash).toHaveBeenCalledWith("plain-pass", 10);
            expect(mockUserRepository.createUser).toHaveBeenCalled();
            expect(result).toHaveProperty("password", "hashed-new-password");
        });

        test("should throw 403 when email already exists", async () => {
            mockUserRepository.getUserByEmail.mockResolvedValue(baseUser);

            await expect(
                service.registerUser({
                    fullName: "Test User",
                    email: "test@email.com",
                    password: "plain-pass",
                    confirmPassword: "plain-pass",
                } as any)
            ).rejects.toMatchObject({
                statusCode: 403,
                message: "Email is already in use",
            });
        });
    });

    describe("loginUser", () => {
        test("should throw 404 when user is not found", async () => {
            mockUserRepository.getUserByEmail.mockResolvedValue(null);

            await expect(
                service.loginUser({
                    email: "missing@email.com",
                    password: "plain-pass",
                } as any)
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "User not found",
            });
        });

        test("should throw 401 when password does not match", async () => {
            mockUserRepository.getUserByEmail.mockResolvedValue(baseUser);
            mockedBcrypt.compare.mockResolvedValue(false);

            await expect(
                service.loginUser({
                    email: baseUser.email,
                    password: "wrong-pass",
                } as any)
            ).rejects.toMatchObject({
                statusCode: 401,
                message: "Invalid credentials",
            });
        });

        test("should return token and user when login succeeds", async () => {
            mockUserRepository.getUserByEmail.mockResolvedValue(baseUser);
            mockedBcrypt.compare.mockResolvedValue(true);
            mockedJwt.sign.mockReturnValue("jwt-token");

            const result = await service.loginUser({
                email: baseUser.email,
                password: "plain-pass",
            } as any);

            expect(mockedBcrypt.compare).toHaveBeenCalledWith("plain-pass", baseUser.password);
            expect(mockedJwt.sign).toHaveBeenCalled();
            expect(result).toEqual({
                token: "jwt-token",
                existingUser: baseUser,
            });
        });
    });

    describe("getUserById", () => {
        test("should return user when found", async () => {
            mockUserRepository.getUserById.mockResolvedValue(baseUser);

            const user = await service.getUserById(baseUser._id);
            expect(user).toEqual(baseUser);
        });

        test("should throw 404 when user is missing", async () => {
            mockUserRepository.getUserById.mockResolvedValue(null);

            await expect(service.getUserById(baseUser._id)).rejects.toMatchObject({
                statusCode: 404,
                message: "User Not Found",
            });
        });
    });

    describe("updateUser", () => {
        test("should throw 404 when target user does not exist", async () => {
            mockUserRepository.getUserById.mockResolvedValue(null);

            await expect(
                service.updateUser(baseUser._id, { fullName: "Updated Name" } as any)
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "User not found",
            });
        });

        test("should throw 403 when new email is already in use", async () => {
            mockUserRepository.getUserById.mockResolvedValue(baseUser);
            mockUserRepository.getUserByEmail.mockResolvedValue({
                ...baseUser,
                _id: "507f191e810c19729de860ea",
                email: "taken@email.com",
            });

            await expect(
                service.updateUser(baseUser._id, { email: "taken@email.com" } as any)
            ).rejects.toMatchObject({
                statusCode: 403,
                message: "Email already in use",
            });
        });

        test("should hash password and update user", async () => {
            mockUserRepository.getUserById.mockResolvedValue(baseUser);
            mockedBcrypt.hash.mockResolvedValue("hashed-updated-password");
            mockUserRepository.updateOneUser.mockResolvedValue({
                ...baseUser,
                password: "hashed-updated-password",
            });

            const result = await service.updateUser(baseUser._id, {
                email: baseUser.email,
                password: "new-password",
            } as any);

            expect(mockedBcrypt.hash).toHaveBeenCalledWith("new-password", 10);
            expect(mockUserRepository.updateOneUser).toHaveBeenCalledWith(
                baseUser._id,
                expect.objectContaining({ password: "hashed-updated-password" })
            );
            expect(result).toHaveProperty("password", "hashed-updated-password");
        });
    });

    describe("uploadProfilePicture", () => {
        test("should throw 400 when no file is provided", async () => {
            await expect(service.uploadProfilePicture(baseUser._id)).rejects.toMatchObject({
                statusCode: 400,
                message: "Please upload a file",
            });
        });

        test("should throw 404 when user is not found", async () => {
            mockUserRepository.getUserById.mockResolvedValue(null);

            await expect(
                service.uploadProfilePicture(baseUser._id, { filename: "new.png" } as any)
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "User not found",
            });
        });

        test("should delete old image and update profile picture", async () => {
            mockUserRepository.getUserById.mockResolvedValue(baseUser);
            mockUserRepository.uploadProfilePicture.mockResolvedValue({
                ...baseUser,
                profilePicture: "new-avatar.png",
            });

            const existsSpy = jest.spyOn(fs, "existsSync").mockReturnValue(true);
            const unlinkSpy = jest
                .spyOn(fs.promises, "unlink")
                .mockResolvedValue(undefined as any);

            const result = await service.uploadProfilePicture(baseUser._id, {
                filename: "new-avatar.png",
            } as any);

            expect(existsSpy).toHaveBeenCalled();
            expect(unlinkSpy).toHaveBeenCalled();
            expect(mockUserRepository.uploadProfilePicture).toHaveBeenCalledWith(
                baseUser._id,
                "new-avatar.png"
            );
            expect(result).toHaveProperty("profilePicture", "new-avatar.png");
        });
    });

    describe("sendResetPasswordEmail", () => {
        test("should throw 400 when email is missing", async () => {
            await expect(service.sendResetPasswordEmail()).rejects.toMatchObject({
                statusCode: 400,
                message: "Email is required",
            });
        });

        test("should throw 404 when user does not exist", async () => {
            mockUserRepository.getUserByEmail.mockResolvedValue(null);

            await expect(
                service.sendResetPasswordEmail("missing@email.com")
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "User not found",
            });
        });

        test("should generate token and call sendEmail", async () => {
            mockUserRepository.getUserByEmail.mockResolvedValue(baseUser);
            mockedJwt.sign.mockReturnValue("reset-token");
            mockedSendEmail.mockResolvedValue(true);

            const result = await service.sendResetPasswordEmail(baseUser.email);

            expect(mockedJwt.sign).toHaveBeenCalled();
            expect(mockedSendEmail).toHaveBeenCalledWith(
                baseUser.email,
                "Password Reset",
                expect.stringContaining("/reset-password?token=reset-token")
            );
            expect(result).toEqual(baseUser);
        });
    });

    describe("resetPassword", () => {
        test("should throw 400 for invalid token", async () => {
            mockedJwt.verify.mockImplementation(() => {
                throw new Error("invalid token");
            });

            await expect(
                service.resetPassword("bad-token", "new-password")
            ).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid or expired token",
            });
        });

        test("should update password when token is valid", async () => {
            mockedJwt.verify.mockReturnValue({ id: baseUser._id });
            mockUserRepository.getUserById.mockResolvedValue(baseUser);
            mockedBcrypt.hash.mockResolvedValue("hashed-after-reset");
            mockUserRepository.updateOneUser.mockResolvedValue({
                ...baseUser,
                password: "hashed-after-reset",
            });

            const result = await service.resetPassword("valid-token", "new-password");

            expect(mockedJwt.verify).toHaveBeenCalled();
            expect(mockedBcrypt.hash).toHaveBeenCalledWith("new-password", 10);
            expect(mockUserRepository.updateOneUser).toHaveBeenCalledWith(baseUser._id, {
                password: "hashed-after-reset",
            });
            expect(result).toEqual(baseUser);
        });

        test("should return generic token error when args are missing", async () => {
            await expect(service.resetPassword(undefined, undefined)).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid or expired token",
            });
        });
    });

    test("HttpError shape remains consistent", () => {
        const error = new HttpError(418, "test");
        expect(error.statusCode).toBe(418);
        expect(error.message).toBe("test");
    });
});
