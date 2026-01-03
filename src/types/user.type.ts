import z from "zod";

export const UserSchema = z.object ({
    fullName: z.string().trim().min(2, "Full name should be more than 2 characters"),
    email: z.email(),
    password: z.string().trim().min(6, "Password can't be less than 6 characters"),
    role: z.enum(['admin','user']).default('user'),
});

export type UserType = z.infer<typeof UserSchema>;