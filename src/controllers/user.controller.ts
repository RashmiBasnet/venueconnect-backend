import { UpdateUserDto } from "../dtos/user.dto";
import { UserService } from "../services/user.service";
import { Request, Response } from "express";
import z from "zod";

let userService = new UserService();

export class UserController {
    async getProfile(req: Request, res: Response) {
        try{
            const userId = req.user?._id;
            if(!userId) {
                return res.status(400).json({
                    success: false,
                    message: "User Id not found"
                });
            }
            const user = await userService.getUserById(userId);
            return res.status(200).json({
                success: true,
                data: user,
                message: "User profile fetched successfully"
            });
        } catch(error: Error | any) {
            return res.status(error.statusCode || 500).json(
                { success: false, message: error.message || "Internal Server Error"}
            );
        }
    }

    async updateProfile(req: Request, res: Response) {
        try {
            const userId = req.user?._id;
            if(!userId){
                return res.status(400).json({
                    success: false,
                    message: "User Id not found"
                });
            }
            const parsedData = UpdateUserDto.safeParse(req.body);
            if(!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: z.prettifyError(parsedData.error)
                });
            }
            if(req.file) {
                parsedData.data.profilePicture = `${req.file.filename}`;
            }
            const updatedUser = await userService.updateUser(userId, parsedData.data);
            return res.status(200).json({
                success: true,
                data: updatedUser,
                message: "User Profile updated sucessfully"
            });
        } catch (err: Error | any) {
            return res.status(400).json({
                success: false,
                message: err.message || "Internal Server Error"
            })
        }
    }

    async uploadProfilePicture(req: Request, res: Response) {
        try {
            const userId = req.user?._id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: "User Id not found",
                });
            }
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Please upload a file",
                });
            }
            const updatedUser = await userService.uploadProfilePicture(userId, req.file);
            return res.status(200).json({
                success: true,
                data: { profilePicture: updatedUser.profilePicture },
                message: "Profile picture uploaded successfully",
            });
        } catch (err: Error | any) {
            return res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || "Internal Server Error",
            });
        }
    }

}