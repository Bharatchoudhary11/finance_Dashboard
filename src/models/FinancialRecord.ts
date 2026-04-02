import { Schema, model, type Document } from 'mongoose';

export type RecordType = 'income' | 'expense';

export interface FinancialRecordDocument extends Document {
  id: string;
  amount: number;
  type: RecordType;
  category: string;
  date: Date;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const financialRecordSchema = new Schema<FinancialRecordDocument>(
  {
    amount: { type: Number, required: true, min: [0, 'amount must be positive'] },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true, trim: true },
    date: { type: Date, required: true, default: () => new Date() },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

financialRecordSchema.index({ date: 1, type: 1, category: 1 });

export const FinancialRecord = model<FinancialRecordDocument>('FinancialRecord', financialRecordSchema);
