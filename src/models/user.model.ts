import mongoose, { Document, Schema} from "mongoose";
import { UserType } from "../types/user.type";

const UserSchema: Schema = new Schema({
    fullName : { type : String, required : true, minLength : 2},
    email : { type: String, required: true, unique : true},
    password : { type : String, required: true, minLength : 6},
    role: { type : String, enum : ['admin', 'user'], default : 'user' },
}, {
    timestamps: true,
});

export interface IUser extends UserType, Document {
    _id: mongoose.Types.ObjectId,
    createdAt: Date,
    updatedAt: Date,
}

export const UserModel = mongoose.model<IUser>("User", UserSchema);