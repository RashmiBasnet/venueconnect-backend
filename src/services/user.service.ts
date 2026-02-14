import { CreateUserDto, LoginUserDto, UpdateUserDto } from "../dtos/user.dto";
import { UserRepository } from "../repositories/user.repository";
import bcryptjs from "bcryptjs";
import { HttpError } from "../errors/http-error";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import path from "path";
import fs from "fs";
import { sendEmail } from "../config/email";

const CLIENT_URL = process.env.CLIENT_URL as string;

let userRepository = new UserRepository();

export class UserService {
    async registerUser(data: CreateUserDto) {
        const checkEmail = await userRepository.getUserByEmail(data.email);
        if (checkEmail) {
            throw new HttpError(403, "Email is already in use");
        }
        const hashedPassword = await bcryptjs.hash(data.password, 10); // 10 complexity
        data.password = hashedPassword;
        const newUser = await userRepository.createUser(data);

        return newUser;
    }

    async loginUser(data: LoginUserDto) {
        const existingUser = await userRepository.getUserByEmail(data.email);
        if (!existingUser) {
            throw new HttpError(404, "User not found");
        }
        const isPassword = await bcryptjs.compare(data.password, existingUser.password);
        if (!isPassword) {
            throw new HttpError(401, "Invalid credentials");
        }
        const payload = {
            id: existingUser._id,
            fullName: existingUser.fullName,
            email: existingUser.email,
            role: existingUser.role
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });

        return { token, existingUser };
    }

    async getUserById(userId: string) {
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new HttpError(404, "User Not Found");
        }
        return user;
    }

    async updateUser(userId: string, data: UpdateUserDto) {
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new HttpError(404, "User not found");
        }
        if (user.email !== data.email) {
            const emailExists = await userRepository.getUserByEmail(data.email!);
            if (emailExists) {
                throw new HttpError(403, "Email already in use");
            }
        }
        if (data.password) {
            const hashedPassword = await bcryptjs.hash(data.password, 10);
            data.password = hashedPassword;
        }
        const updatedUser = await userRepository.updateOneUser(userId, data);
        return updatedUser;
    }

    async uploadProfilePicture(userId: string, file?: Express.Multer.File) {
        if (!file) {
            throw new HttpError(400, "Please upload a file");
        }

        const fileName = file.filename;

        const user = await userRepository.getUserById(userId);
        if (!user) {
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

    async sendResetPasswordEmail(email?: string) {
        if (!email) {
            throw new HttpError(400, "Email is required");
        }
        const user = await userRepository.getUserByEmail(email);
        if (!user) {
            throw new HttpError(404, "User not found");
        }
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
        const resetLink = `${CLIENT_URL}/reset-password?token=${token}`;

        const html = `
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
            Reset your password using the secure link (expires in 1 hour).
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background:#F4F1EE;">
            <tr>
            <td align="center" style="padding:28px 12px;">

                <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                style="width:600px;max-width:600px;background:#ffffff;border:1px solid #E9E2DC;border-radius:14px;overflow:hidden;">

                <!-- Header -->
                <tr>
                    <td style="background:#233041;padding:22px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                        <td align="left" style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
                            <div style="font-size:18px;font-weight:700;letter-spacing:0.2px;">
                            VenueConnect
                            </div>
                            <div style="font-size:12px;opacity:0.9;margin-top:4px;">
                            Secure account support
                            </div>
                        </td>
                        <td align="right" style="font-family:Arial,Helvetica,sans-serif;">
                            <span style="display:inline-block;background:#AE8E54;color:white;font-size:12px;font-weight:700;padding:6px 10px;border-radius:999px;">
                            Password Reset
                            </span>
                        </td>
                        </tr>
                    </table>
                    </td>
                </tr>

                <!-- Body -->
                <tr>
                    <td style="padding:26px 24px 10px 24px;font-family:Arial,Helvetica,sans-serif;color:#233041;">
                    <h2 style="margin:0;font-size:22px;line-height:1.25;">
                        Reset your password
                    </h2>

                    <p style="margin:12px 0 0 0;font-size:14px;line-height:1.7;color:#3b4656;">
                        We received a request to reset your account password. Click the button below to set a new one.
                    </p>

                    <div style="margin:16px 0 0 0;padding:14px 14px;background:#FBF8F5;border:1px solid #E9E2DC;border-radius:12px;">
                        <div style="font-size:13px;color:#3b4656;line-height:1.6;">
                        <strong style="color:#233041;">This link expires in 1 hour.</strong><br/>
                        If you didn’t request this, you can ignore this email safely.
                        </div>
                    </div>

                    <!-- Button -->
                    <div style="text-align:center;margin:22px 0 10px 0;">
                        <a href="${resetLink}"
                        style="
                            display:inline-block;
                            background:#AE8E54;
                            color:white;
                            text-decoration:none;
                            padding:14px 26px;
                            border-radius:12px;
                            font-weight:800;
                            font-size:14px;
                            letter-spacing:0.2px;
                            border:1px solid #A58A4F;
                        ">
                        Reset Password
                        </a>
                    </div>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="background:#F8F6F4;padding:16px 24px;font-family:Arial,Helvetica,sans-serif;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                        <td align="left" style="font-size:12px;color:#667085;">
                            © ${new Date().getFullYear()} VenueConnect. All rights reserved.
                        </td>
                        </tr>
                    </table>
                    </td>
                </tr>

                </table>

                <div style="max-width:600px;font-family:Arial,Helvetica,sans-serif;color:#98A2B3;font-size:11px;line-height:1.6;margin-top:10px;">
                This is an automated message, please do not reply.
                </div>

            </td>
            </tr>
        </table>
        `;


        await sendEmail(user.email, "Password Reset", html);
        return user;
    }

    async resetPassword(token?: string, newPassword?: string) {
        try {
            if (!token || !newPassword) {
                throw new HttpError(400, "Token and new password are required");
            }
            const decoded: any = jwt.verify(token, JWT_SECRET);
            const userId = decoded.id;
            const user = await userRepository.getUserById(userId);
            if (!user) {
                throw new HttpError(404, "User not found");
            }
            const hashedPassword = await bcryptjs.hash(newPassword, 10);
            await userRepository.updateOneUser(userId, { password: hashedPassword });
            return user;
        } catch (error) {
            throw new HttpError(400, "Invalid or expired token");
        }
    }
}