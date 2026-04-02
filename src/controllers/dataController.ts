import type { Request, Response } from 'express';
import type { QueryFilter } from 'mongoose';
import { FinancialRecord, type FinancialRecordDocument, type RecordType } from '../models/FinancialRecord';

type RecordFilter = QueryFilter<FinancialRecordDocument>;

interface RecordFiltersResult {
  filter: RecordFilter;
  applied: Record<string, string | number>;
}

const isRecordType = (value: unknown): value is RecordType => value === 'income' || value === 'expense';

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const toDate = (value: unknown): Date | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const toTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getQueryValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : undefined;
  }
  return typeof value === 'string' ? value : undefined;
};

const buildRecordFilters = (query: Request['query']): RecordFiltersResult => {
  const filter: RecordFilter = {};
  const applied: Record<string, string | number> = {};

  const typeValue = getQueryValue(query.type);
  if (typeValue && isRecordType(typeValue)) {
    filter.type = typeValue;
    applied.type = typeValue;
  }

  const categoryValue = toTrimmedString(getQueryValue(query.category));
  if (categoryValue) {
    filter.category = { $regex: new RegExp(escapeRegex(categoryValue), 'i') };
    applied.category = categoryValue;
  }

  const startDateValue = toDate(getQueryValue(query.startDate));
  const endDateValue = toDate(getQueryValue(query.endDate));
  if (startDateValue || endDateValue) {
    filter.date = {};
    if (startDateValue) {
      filter.date.$gte = startDateValue;
      applied.startDate = startDateValue.toISOString();
    }
    if (endDateValue) {
      filter.date.$lte = endDateValue;
      applied.endDate = endDateValue.toISOString();
    }
  }

  const minAmountValue = toNumber(getQueryValue(query.minAmount));
  const maxAmountValue = toNumber(getQueryValue(query.maxAmount));
  if (minAmountValue !== undefined || maxAmountValue !== undefined) {
    filter.amount = {};
    if (minAmountValue !== undefined) {
      filter.amount.$gte = minAmountValue;
      applied.minAmount = minAmountValue;
    }
    if (maxAmountValue !== undefined) {
      filter.amount.$lte = maxAmountValue;
      applied.maxAmount = maxAmountValue;
    }
  }

  return { filter, applied };
};

export const getDashboardData = async (_req: Request, res: Response) => {
  const summary = await FinancialRecord.aggregate<{
    _id: RecordType;
    total: number;
  }>([
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);

  const getTotal = (type: RecordType) => summary.find((item) => item._id === type)?.total ?? 0;
  const totalIncome = getTotal('income');
  const totalExpense = getTotal('expense');

  return res.json({
    summary: {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      updatedAt: new Date().toISOString(),
    },
  });
};

export const getAnalystRecords = async (req: Request, res: Response) => {
  const { filter, applied } = buildRecordFilters(req.query);
  const records = await FinancialRecord.find(filter).sort({ date: -1, createdAt: -1 }).lean();

  return res.json({
    records,
    appliedFilters: applied,
    total: records.length,
  });
};

export const getRecordById = async (req: Request, res: Response) => {
  const record = await FinancialRecord.findById(req.params.id).lean();
  if (!record) {
    return res.status(404).json({ message: 'Record not found.' });
  }

  return res.json(record);
};

export const createRecord = async (req: Request, res: Response) => {
  const { amount, type, category, date, notes } = req.body as {
    amount?: number;
    type?: string;
    category?: string;
    date?: string;
    notes?: string;
  };

  const normalizedAmount = toNumber(amount);
  if (normalizedAmount === undefined || normalizedAmount <= 0) {
    return res.status(400).json({ message: 'amount must be a positive number.' });
  }

  if (!isRecordType(type)) {
    return res.status(400).json({ message: 'type must be either income or expense.' });
  }

  const normalizedCategory = toTrimmedString(category);
  if (!normalizedCategory) {
    return res.status(400).json({ message: 'category is required.' });
  }

  const normalizedDate = date ? toDate(date) : new Date();
  if (!normalizedDate) {
    return res.status(400).json({ message: 'date must be a valid ISO date string.' });
  }

  const normalizedNotes = typeof notes === 'string' && notes.trim().length > 0 ? notes.trim() : undefined;

  const record = new FinancialRecord({
    amount: normalizedAmount,
    type,
    category: normalizedCategory,
    date: normalizedDate,
    notes: normalizedNotes,
    createdBy: req.authUser?.id,
  });

  await record.save();
  return res.status(201).json(record.toObject());
};

export const updateRecord = async (req: Request, res: Response) => {
  const record = await FinancialRecord.findById(req.params.id);
  if (!record) {
    return res.status(404).json({ message: 'Record not found.' });
  }

  const { amount, type, category, date, notes } = req.body as {
    amount?: number;
    type?: string;
    category?: string;
    date?: string;
    notes?: string | null;
  };

  let updated = false;

  if (amount !== undefined) {
    const normalizedAmount = toNumber(amount);
    if (normalizedAmount === undefined || normalizedAmount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number when provided.' });
    }
    record.amount = normalizedAmount;
    updated = true;
  }

  if (type !== undefined) {
    if (!isRecordType(type)) {
      return res.status(400).json({ message: 'type must be either income or expense when provided.' });
    }
    record.type = type;
    updated = true;
  }

  if (category !== undefined) {
    const normalizedCategory = toTrimmedString(category);
    if (!normalizedCategory) {
      return res.status(400).json({ message: 'category must be a non-empty string when provided.' });
    }
    record.category = normalizedCategory;
    updated = true;
  }

  if (date !== undefined) {
    const normalizedDate = toDate(date);
    if (!normalizedDate) {
      return res.status(400).json({ message: 'date must be a valid ISO date string when provided.' });
    }
    record.date = normalizedDate;
    updated = true;
  }

  if (notes !== undefined) {
    if (notes === null || (typeof notes === 'string' && notes.trim().length === 0)) {
      record.set('notes', undefined);
    } else if (typeof notes === 'string') {
      record.notes = notes.trim();
    } else {
      return res.status(400).json({ message: 'notes must be a string when provided.' });
    }
    updated = true;
  }

  if (!updated) {
    return res.status(400).json({ message: 'Provide at least one field to update.' });
  }

  await record.save();
  return res.json(record.toObject());
};

export const deleteRecord = async (req: Request, res: Response) => {
  const record = await FinancialRecord.findByIdAndDelete(req.params.id);
  if (!record) {
    return res.status(404).json({ message: 'Record not found.' });
  }

  return res.status(204).send();
};

export const getAdminInsights = async (_req: Request, res: Response) => {
  const [recordCount, recentRecords] = await Promise.all([
    FinancialRecord.countDocuments(),
    FinancialRecord.find().sort({ createdAt: -1 }).limit(3).lean(),
  ]);

  return res.json({
    alerts: [
      { severity: 'info', message: `${recordCount} total records in the system.` },
      { severity: 'info', message: `Most recent entry: ${recentRecords[0]?.category ?? 'N/A'}` },
    ],
  });
};
