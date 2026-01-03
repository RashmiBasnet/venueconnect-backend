import { IUser, UserModel } from "../models/user.model";

export interface IUserRepository {
    createUser(data: Partial<IUser>): Promise<IUser>;
    getAllUsers(): Promise<IUser[]>;
    getUserById(id: String): Promise<IUser | null>;
    updateUser(id: String, data: Partial<IUser>): Promise<IUser | null>;
    deleteUser(id: String): Promise<boolean | null>;
    
    getUserByEmail(email: String): Promise<IUser | null>;
}

export class UserRepository implements IUserRepository{
    async createUser(data: Partial<IUser>): Promise<IUser> {
        const user = new UserModel(data);
        return await user.save();
    }

    async getAllUsers(): Promise<IUser[]> {
        const user = await UserModel.find();
        return user;
    }

    async getUserById(id: String): Promise<IUser | null> {
        const user = await UserModel.findById(id);
        return user;
    }

    async updateUser(id: String, data: Partial<IUser>): Promise<IUser | null> {
        const updatedUser = await UserModel.findByIdAndUpdate(id, data, {new : true});
        return updatedUser;
    }

    async deleteUser(id: String): Promise<boolean | null> {
        const result = await UserModel.findByIdAndDelete(id);
        return result ? true : false;
    }

    async getUserByEmail(email: String): Promise<IUser | null> {
        const user = await UserModel.findOne({"email": email});
        return user;
    }

}