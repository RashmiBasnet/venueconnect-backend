import { CreateUserDto, LoginUserDto } from "../dtos/user.dto";
import { UserRepository } from "../repositories/user.repository";
import bcryptjs from "bcryptjs";
import { HttpError } from "../errors/http-error";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";

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
}