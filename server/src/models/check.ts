import { Schema, model, type HydratedDocumentFromSchema } from 'mongoose';
import { CHECK_TTL_SECONDS } from '../config/constants.js';

const checkSchema = new Schema(
  {
    urlId: { type: Schema.Types.ObjectId, required: true },
    timestamp: { type: Date, required: true },
    statusCode: { type: Number, default: null },
    latencyMs: { type: Number, default: null },
    isUp: { type: Boolean, required: true },
    error: { type: String, default: null },
  },
  { versionKey: false },
);

checkSchema.index({ urlId: 1, timestamp: 1 });
checkSchema.index({ timestamp: 1 }, { expireAfterSeconds: CHECK_TTL_SECONDS });

export type CheckDocument = HydratedDocumentFromSchema<typeof checkSchema>;

export const CheckModel = model('Check', checkSchema);



