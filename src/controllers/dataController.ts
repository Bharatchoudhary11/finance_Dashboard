import type { Request, Response } from 'express';

interface FinancialRecord {
  id: string;
  type: 'expense' | 'revenue';
  amount: number;
  owner: string;
}

const financialRecords: FinancialRecord[] = [
  { id: 'txn-01', type: 'expense', amount: 5200, owner: 'Marketing' },
  { id: 'txn-02', type: 'revenue', amount: 9800, owner: 'Sales' },
];

export const getDashboardData = (_req: Request, res: Response) => {
  return res.json({
    summary: {
      totalRevenue: 1250000,
      expenseRatio: 0.37,
      updatedAt: new Date().toISOString(),
    },
    highlights: [
      { label: 'Top Region', value: 'North America' },
      { label: 'YoY Growth', value: '12%' },
    ],
  });
};

export const getAnalystRecords = (_req: Request, res: Response) => {
  return res.json({
    records: financialRecords,
  });
};

export const getAdminInsights = (_req: Request, res: Response) => {
  return res.json({
    alerts: [
      { severity: 'warning', message: 'Pending approval backlog exceeds SLA.' },
      { severity: 'info', message: '3 new analysts awaiting onboarding.' },
    ],
  });
};

export const createRecord = (req: Request, res: Response) => {
  const { type, amount, owner } = req.body as {
    type?: FinancialRecord['type'];
    amount?: number;
    owner?: string;
  };

  if (!type || (type !== 'expense' && type !== 'revenue')) {
    return res.status(400).json({ message: 'type must be either expense or revenue.' });
  }
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'amount must be a positive number.' });
  }
  if (!owner || !owner.trim()) {
    return res.status(400).json({ message: 'owner is required.' });
  }

  const id = `txn-${String(financialRecords.length + 1).padStart(2, '0')}`;
  const newRecord: FinancialRecord = { id, type, amount, owner: owner.trim() };
  financialRecords.push(newRecord);

  return res.status(201).json(newRecord);
};

export const updateRecord = (req: Request, res: Response) => {
  const record = financialRecords.find((item) => item.id === req.params.id);
  if (!record) {
    return res.status(404).json({ message: 'Record not found.' });
  }

  const { type, amount, owner } = req.body as {
    type?: FinancialRecord['type'];
    amount?: number;
    owner?: string;
  };

  if (type !== undefined) {
    if (type !== 'expense' && type !== 'revenue') {
      return res.status(400).json({ message: 'type must be either expense or revenue.' });
    }
    record.type = type;
  }

  if (amount !== undefined) {
    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number.' });
    }
    record.amount = amount;
  }

  if (owner !== undefined) {
    if (!owner.trim()) {
      return res.status(400).json({ message: 'owner must be a non-empty string.' });
    }
    record.owner = owner.trim();
  }

  return res.json(record);
};
