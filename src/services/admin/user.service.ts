import { CreateUserDto, UpdateUserDto } from "../../dtos/user.dto";
import { UserRepository } from "../../repositories/user.repository";
import  bcryptjs from "bcryptjs"
import { HttpError } from "../../errors/http-error";

let userRepository = new UserRepository();

export class AdminUserService {
    async createUser(data: CreateUserDto){
        const emailCheck = await userRepository.getUserByEmail(data.email);
        if(emailCheck){
            throw new HttpError(403, "Email already in use");
        }
        // hash password
        const hashedPassword = await bcryptjs.hash(data.password, 10); // 10 - complexity
        data.password = hashedPassword;

        const newUser = await userRepository.createUser(data);
        return newUser;
    }

    async getAllUsers({ page, size, search }: { page?: string | undefined, size?: string | undefined, search?: string | undefined }) {
        const currentPage = page ? parseInt(page) : 1;
        const currentSize = size ? parseInt(size) : 10;
        const currentSearch = search || "";
        const { users, totalUsers } = await userRepository.getAllUsers({ page: currentPage, size: currentSize, search: currentSearch });
        const pagination = {
            page: currentPage,
            size: currentSize,
            total: totalUsers,
            totalPages: Math.ceil(totalUsers / currentSize),
        }
        return { users, pagination };
    }

    async deleteUser(id: string){
        const user = await userRepository.getUserById(id);
        if(!user){
            throw new HttpError(404, "User not found");
        }
        const deleted = await userRepository.deleteOneUser(id);
        return deleted;
    }

    async updateUser(id: string, updateData: UpdateUserDto){
        const user = await userRepository.getUserById(id);
        if(!user){
            throw new HttpError(404, "User not found");
        }
        const updatedUser = await userRepository.updateOneUser(id, updateData);
        return updatedUser;
    }

    async  getUserById(id: string){
        const user = await userRepository.getUserById(id);
        if(!user){
            throw new HttpError(404, "User not found");
        }
        return user;
    }

}