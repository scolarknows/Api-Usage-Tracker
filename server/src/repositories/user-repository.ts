import { Types } from 'mongoose';
import { UserModel, type UserDocument } from '../models/user.js';
import type { UserRecord } from '../types/records.js';

function toRecord(doc: UserDocument): UserRecord {
  return {
    id: doc._id.toString(),
    email: doc.email,
    passwordHash: doc.passwordHash,
    createdAt: doc.createdAt,
  };
}

function isDuplicate(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export const userRepository = {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const doc = await UserModel.findOne({ email });
    return doc ? toRecord(doc) : null;
  },

  async findById(id: string): Promise<UserRecord | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await UserModel.findById(id);
    return doc ? toRecord(doc) : null;
  },

  async create(email: string, passwordHash: string): Promise<UserRecord | null> {
    try {
      const doc = await UserModel.create({ email, passwordHash });
      return toRecord(doc);
    } catch (error) {
      if (isDuplicate(error)) return null;
      throw error;
    }
  },
};
