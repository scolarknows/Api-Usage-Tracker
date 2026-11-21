import { Schema, model, type HydratedDocumentFromSchema } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { versionKey: false },
);

export type UserDocument = HydratedDocumentFromSchema<typeof userSchema>;

export const UserModel = model('User', userSchema);



