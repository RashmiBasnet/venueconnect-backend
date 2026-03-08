const mockUserRepository = {
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
    getAllUsers: jest.fn(),
    getUserById: jest.fn(),
    deleteOneUser: jest.fn(),
    updateOneUser: jest.fn(),
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
    },
}));

import bcryptjs from "bcryptjs";
import { AdminUserService } from "../../services/admin/user.service";

describe("AdminUserService Unit Tests", () => {
    const service = new AdminUserService();
    const mockedBcrypt = bcryptjs as unknown as { hash: jest.Mock };

    const baseUser = {
        _id: "507f1f77bcf86cd799439011",
        fullName: "Admin Created",
        email: "admin-created@email.com",
        password: "hashed-pass",
        role: "user",
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("createUser", () => {
        test("throws 403 when email already exists", async () => {
            mockUserRepository.getUserByEmail.mockResolvedValue(baseUser);

            await expect(
                service.createUser({
                    fullName: "Admin Created",
                    email: baseUser.email,
                    password: "pass123",
                    confirmPassword: "pass123",
                } as any)
            ).rejects.toMatchObject({
                statusCode: 403,
                message: "Email already in use",
            });
        });

        test("hashes password and creates user", async () => {
            mockUserRepository.getUserByEmail.mockResolvedValue(null);
            mockedBcrypt.hash.mockResolvedValue("hashed-pass");
            mockUserRepository.createUser.mockResolvedValue(baseUser);

            const result = await service.createUser({
                fullName: "Admin Created",
                email: baseUser.email,
                password: "pass123",
                confirmPassword: "pass123",
            } as any);

            expect(mockedBcrypt.hash).toHaveBeenCalledWith("pass123", 10);
            expect(mockUserRepository.createUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: baseUser.email,
                    password: "hashed-pass",
                })
            );
            expect(result).toEqual(baseUser);
        });
    });

    describe("getAllUsers", () => {
        test("returns paginated users with defaults", async () => {
            mockUserRepository.getAllUsers.mockResolvedValue({
                users: [baseUser],
                totalUsers: 1,
            });

            const result = await service.getAllUsers({});

            expect(mockUserRepository.getAllUsers).toHaveBeenCalledWith({
                page: 1,
                size: 10,
                search: "",
            });
            expect(result).toEqual({
                users: [baseUser],
                pagination: {
                    page: 1,
                    size: 10,
                    total: 1,
                    totalPages: 1,
                },
            });
        });
    });

    describe("getUserById", () => {
        test("throws 404 when user not found", async () => {
            mockUserRepository.getUserById.mockResolvedValue(null);

            await expect(service.getUserById(baseUser._id)).rejects.toMatchObject({
                statusCode: 404,
                message: "User not found",
            });
        });

        test("returns user when found", async () => {
            mockUserRepository.getUserById.mockResolvedValue(baseUser);

            const result = await service.getUserById(baseUser._id);
            expect(result).toEqual(baseUser);
        });
    });

    describe("updateUser", () => {
        test("throws 404 if target user missing", async () => {
            mockUserRepository.getUserById.mockResolvedValue(null);

            await expect(
                service.updateUser(baseUser._id, { fullName: "Updated" } as any)
            ).rejects.toMatchObject({
                statusCode: 404,
                message: "User not found",
            });
        });

        test("updates user when found", async () => {
            mockUserRepository.getUserById.mockResolvedValue(baseUser);
            mockUserRepository.updateOneUser.mockResolvedValue({
                ...baseUser,
                fullName: "Updated",
            });

            const result = await service.updateUser(baseUser._id, {
                fullName: "Updated",
            } as any);

            expect(mockUserRepository.updateOneUser).toHaveBeenCalledWith(baseUser._id, {
                fullName: "Updated",
            });
            expect(result).toHaveProperty("fullName", "Updated");
        });
    });

    describe("deleteUser", () => {
        test("throws 404 when user missing", async () => {
            mockUserRepository.getUserById.mockResolvedValue(null);

            await expect(service.deleteUser(baseUser._id)).rejects.toMatchObject({
                statusCode: 404,
                message: "User not found",
            });
        });

        test("deletes user when found", async () => {
            mockUserRepository.getUserById.mockResolvedValue(baseUser);
            mockUserRepository.deleteOneUser.mockResolvedValue(true);

            const result = await service.deleteUser(baseUser._id);
            expect(mockUserRepository.deleteOneUser).toHaveBeenCalledWith(baseUser._id);
            expect(result).toBe(true);
        });
    });
});
