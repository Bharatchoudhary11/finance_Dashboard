import type { Request, Response } from 'express';
import type { QueryFilter } from 'mongoose';
import { FinancialRecord, type FinancialRecordDocument, type RecordType } from '../models/FinancialRecord';

type RecordFilter = QueryFilter<FinancialRecordDocument>;

interface RecordFiltersResult {
  filter: RecordFilter;
  applied: Record<string, string | number>;
}

interface SummaryFacet {
  _id: RecordType;
  total: number;
}

interface CategoryFacet {
  _id: string;
  total: number;
  income: number;
  expense: number;
}

interface MonthlyTrendFacet {
  _id: { year: number; month: number };
  income: number;
  expense: number;
}

interface DashboardAggregates {
  summary: SummaryFacet[];
  categoryTotals: CategoryFacet[];
  monthlyTrend: MonthlyTrendFacet[];
}

interface MonthlyTrendPoint {
  label: string;
  income: number;
  expense: number;
  net: number;
}

const TREND_WINDOW_MONTHS = 6;

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

const formatYearMonth = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

const buildMonthlyTrend = (raw: MonthlyTrendFacet[], now: Date): MonthlyTrendPoint[] => {
  const buckets = new Map<string, { income: number; expense: number }>();
  raw.forEach((bucket) => {
    const key = formatYearMonth(bucket._id.year, bucket._id.month);
    buckets.set(key, { income: bucket.income, expense: bucket.expense });
  });

  const points: MonthlyTrendPoint[] = [];
  for (let offset = TREND_WINDOW_MONTHS - 1; offset >= 0; offset -= 1) {
    const bucketDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = formatYearMonth(bucketDate.getFullYear(), bucketDate.getMonth() + 1);
    const data = buckets.get(key) ?? { income: 0, expense: 0 };
    points.push({
      label: key,
      income: data.income,
      expense: data.expense,
      net: data.income - data.expense,
    });
  }
  return points;
};

export const getDashboardData = async (_req: Request, res: Response) => {
  const now = new Date();
  const trendStart = new Date(now.getFullYear(), now.getMonth() - (TREND_WINDOW_MONTHS - 1), 1);

  const [aggregateResult] = await FinancialRecord.aggregate<DashboardAggregates>([
    {
      $facet: {
        summary: [{ $group: { _id: '$type', total: { $sum: '$amount' } } }],
        categoryTotals: [
          {
            $group: {
              _id: '$category',
              total: { $sum: '$amount' },
              income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
              expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
            },
          },
          { $sort: { total: -1 } },
        ],
        monthlyTrend: [
          { $match: { date: { $gte: trendStart } } },
          {
            $group: {
              _id: { year: { $year: '$date' }, month: { $month: '$date' } },
              income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
              expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ],
      },
    },
  ]);

  const recentActivity: Array<{
    _id: FinancialRecordDocument['_id'];
    amount: number;
    type: RecordType;
    category: string;
    date: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
  }> = await FinancialRecord.find()
    .sort({ date: -1, createdAt: -1 })
    .limit(5)
    .lean();

  const summaryBuckets = aggregateResult?.summary ?? [];
  const totalIncome = summaryBuckets.find((bucket) => bucket._id === 'income')?.total ?? 0;
  const totalExpense = summaryBuckets.find((bucket) => bucket._id === 'expense')?.total ?? 0;

  const categoryTotals = (aggregateResult?.categoryTotals ?? []).map((bucket) => ({
    category: bucket._id,
    income: bucket.income,
    expense: bucket.expense,
    total: bucket.total,
  }));
  const categoryGrandTotal = categoryTotals.reduce((sum, bucket) => sum + bucket.total, 0);
  const categoryBreakdown = categoryTotals.map((bucket) => ({
    ...bucket,
    share: categoryGrandTotal === 0 ? 0 : bucket.total / categoryGrandTotal,
  }));

  const monthlyTrend = buildMonthlyTrend(aggregateResult?.monthlyTrend ?? [], now);

  const activityFeed = recentActivity.map((record) => ({
    id: record._id.toString(),
    amount: record.amount,
    type: record.type,
    category: record.category,
    date: record.date,
    notes: record.notes,
  }));

  return res.json({
    summary: {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      updatedAt: now.toISOString(),
    },
    categories: {
      totals: categoryBreakdown,
      grandTotal: categoryGrandTotal,
    },
    monthlyTrend: {
      rangeStart: trendStart.toISOString(),
      months: monthlyTrend,
    },
    recentActivity: activityFeed,
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
