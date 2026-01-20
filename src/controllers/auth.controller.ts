import { CreateUserDto, LoginUserDto } from "../dtos/user.dto";
import { UserService } from "../services/user.service";
import { Request, Response } from "express";
import z from "zod";

let userService = new UserService();

export class AuthController {
    async register(req: Request, res: Response){
        try {
            const parsedData = CreateUserDto.safeParse(req.body);
            if(!parsedData.success){
                return res.status(400).json(
                    { success: false, errors: z.prettifyError(parsedData.error) }
                );
            }
            const newUser = await userService.registerUser(parsedData.data);
            return res.status(201).json(
                { success: true, data: newUser }
            );
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json(
                { success: false, message: error.message || "Internal Server Error"}
            )
        }
    }

    async login(req: Request, res: Response){
        try{
            const parsedData = LoginUserDto.safeParse(req.body);
            if(!parsedData.success){
                return res.status(400).json(
                    { success: false, errors: z.prettifyError(parsedData.error) }
                );
            }
            const { token, existingUser } = await userService.loginUser(parsedData.data);
            return res.status(201).json(
                { success: true, data: existingUser, token, message: "Login Success" }
            );
        } catch(error: Error | any) {
            return res.status(error.statusCode || 500).json(
                { success: false, message: error.message || "Internal Server Error"}
            );
        }
    }
}