import { CreateUserDto, LoginUserDto, UpdateUserDto } from "../dtos/user.dto";
import { UserRepository } from "../repositories/user.repository";
import bcryptjs from "bcryptjs";
import { HttpError } from "../errors/http-error";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import path from "path";
import fs from "fs";

let userRepository = new UserRepository();

export class UserService {
    async registerUser(data: CreateUserDto){
        const checkEmail = await userRepository.getUserByEmail(data.email);
        if(checkEmail) {
            throw new HttpError(403, "Email is already in use");
        }
        const hashedPassword = await bcryptjs.hash(data.password, 10); // 10 complexity
        data.password = hashedPassword;
        const newUser = await userRepository.createUser(data);

        return newUser;
    }

    async loginUser(data: LoginUserDto){
        const existingUser = await userRepository.getUserByEmail(data.email);
        if(!existingUser) {
            throw new HttpError(404, "User not found");
        }
        const isPassword = await bcryptjs.compare(data.password, existingUser.password);
        if(!isPassword) {
            throw new HttpError(401, "Invalid credentials");
        }
        const payload = {
            id: existingUser._id,
            fullName: existingUser.fullName,
            email: existingUser.email,
            role: existingUser.role
        };
        const token = jwt.sign( payload, JWT_SECRET, { expiresIn: "30d" } );

        return { token, existingUser };
    }

    async getUserById(userId: string) {
        const user = await userRepository.getUserById(userId);
        if(!user) {
            throw new HttpError(404, "User Not Found");
        }
        return user;
    }

    async updateUser(userId: string, data: UpdateUserDto) {
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new HttpError(404, "User not found");
        }
        if(user.email !== data.email){
            const emailExists = await userRepository.getUserByEmail(data.email!);
            if(emailExists){
                throw new HttpError(403, "Email already in use");
            }
        }
        if(data.password){
            const hashedPassword = await bcryptjs.hash(data.password, 10);
            data.password = hashedPassword;
        }
        const updatedUser = await userRepository.updateOneUser(userId, data);
        return updatedUser;
    }

    async uploadProfilePicture(userId: string, file?: Express.Multer.File) {
        if(!file) {
            throw new HttpError(400, "Please upload a file");
        }

        const fileName = file.filename;

        const user = await userRepository.getUserById(userId);
        if(!user) {
            throw new HttpError(404, "User not found");
        }

        // delete old file if exists
        const oldFileName = user.profilePicture;
        if (oldFileName) {
            const uploadDir = path.join(process.cwd(), "uploads"); 
            const oldFilePath = path.join(uploadDir, oldFileName);

            if (fs.existsSync(oldFilePath)) {
            await fs.promises.unlink(oldFilePath);
            }
        }

        const updated = await userRepository.uploadProfilePicture(userId, fileName);
        if (!updated) {
            throw new HttpError(404, "User not found");
        }

        return updated;
    }
}