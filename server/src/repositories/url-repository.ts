import { Types } from 'mongoose';
import { MonitoredUrlModel, type MonitoredUrlDocument } from '../models/monitored-url.js';
import type { UrlRecord, UrlStatus } from '../types/records.js';

interface CreateUrlInput {
  userId: string;
  url: string;
  name: string;
}

function toRecord(doc: MonitoredUrlDocument): UrlRecord {
  const status = doc.lastStatus;
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    url: doc.url,
    name: doc.name,
    isActive: doc.isActive,
    lastStatus: status === 'up' || status === 'down' || status === 'pending' ? status : 'pending',
    lastLatencyMs: doc.lastLatencyMs ?? null,
    lastCheckedAt: doc.lastCheckedAt ?? null,
    createdAt: doc.createdAt,
  };
}

function isDuplicate(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export const urlRepository = {
  async countByUser(userId: string): Promise<number> {
    return MonitoredUrlModel.countDocuments({ userId });
  },

  async listByUser(userId: string): Promise<UrlRecord[]> {
    const docs = await MonitoredUrlModel.find({ userId }).sort({ createdAt: 1 }).limit(5);
    return docs.map(toRecord);
  },

  async listActive(): Promise<UrlRecord[]> {
    const docs = await MonitoredUrlModel.find({ isActive: true }).limit(10_000);
    return docs.map(toRecord);
  },

  async findByIdForUser(id: string, userId: string): Promise<UrlRecord | null> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) return null;
    const doc = await MonitoredUrlModel.findOne({ _id: id, userId });
    return doc ? toRecord(doc) : null;
  },

  async create(input: CreateUrlInput): Promise<UrlRecord | null> {
    try {
      const doc = await MonitoredUrlModel.create({
        userId: input.userId,
        url: input.url,
        name: input.name,
      });
      return toRecord(doc);
    } catch (error) {
      if (isDuplicate(error)) return null;
      throw error;
    }
  },

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) return false;
    const result = await MonitoredUrlModel.deleteOne({ _id: id, userId });
    return result.deletedCount === 1;
  },

  async updateLast(
    id: string,
    update: { lastStatus: UrlStatus; lastLatencyMs: number | null; lastCheckedAt: Date },
  ): Promise<void> {
    await MonitoredUrlModel.updateOne({ _id: id }, update);
  },
};
