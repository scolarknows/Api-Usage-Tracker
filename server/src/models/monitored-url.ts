import { Schema, model, type HydratedDocumentFromSchema } from 'mongoose';

const monitoredUrlSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'User' },
    url: { type: String, required: true },
    name: { type: String, required: true, maxlength: 60 },
    isActive: { type: Boolean, required: true, default: true },
    lastStatus: { type: String, required: true, enum: ['up', 'down', 'pending'], default: 'pending' },
    lastLatencyMs: { type: Number, default: null },
    lastCheckedAt: { type: Date, default: null },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { versionKey: false },
);

monitoredUrlSchema.index({ userId: 1, url: 1 }, { unique: true });

export type MonitoredUrlDocument = HydratedDocumentFromSchema<typeof monitoredUrlSchema>;

export const MonitoredUrlModel = model('MonitoredUrl', monitoredUrlSchema);



