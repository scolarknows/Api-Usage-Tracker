import { Types } from 'mongoose';
import { CheckModel, type CheckDocument } from '../models/check.js';
import type { CheckRecord, NewCheck } from '../types/records.js';

function toRecord(doc: CheckDocument): CheckRecord {
  return {
    id: doc._id.toString(),
    urlId: doc.urlId.toString(),
    timestamp: doc.timestamp,
    statusCode: doc.statusCode ?? null,
    latencyMs: doc.latencyMs ?? null,
    isUp: doc.isUp,
    error: doc.error ?? null,
  };
}

export const checkRepository = {
  async insert(input: NewCheck): Promise<CheckRecord> {
    const doc = await CheckModel.create({
      urlId: input.urlId,
      timestamp: input.timestamp,
      statusCode: input.statusCode,
      latencyMs: input.latencyMs,
      isUp: input.isUp,
      error: input.error,
    });
    return toRecord(doc);
  },

  async listSince(urlId: string, since: Date): Promise<CheckRecord[]> {
    if (!Types.ObjectId.isValid(urlId)) return [];
    const docs = await CheckModel.find({ urlId, timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .limit(20_000);
    return docs.map(toRecord);
  },

  async countWindow(urlId: string, since: Date): Promise<{ total: number; up: number }> {
    if (!Types.ObjectId.isValid(urlId)) return { total: 0, up: 0 };
    const [total, up] = await Promise.all([
      CheckModel.countDocuments({ urlId, timestamp: { $gte: since } }),
      CheckModel.countDocuments({ urlId, timestamp: { $gte: since }, isUp: true }),
    ]);
    return { total, up };
  },

  async deleteByUrl(urlId: string): Promise<void> {
    if (!Types.ObjectId.isValid(urlId)) return;
    await CheckModel.deleteMany({ urlId });
  },
};
