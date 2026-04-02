import type { Request, Response } from 'express';

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
    records: [
      { id: 'txn-01', type: 'expense', amount: 5200, owner: 'Marketing' },
      { id: 'txn-02', type: 'revenue', amount: 9800, owner: 'Sales' },
    ],
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
