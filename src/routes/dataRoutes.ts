import { Router } from 'express';
import { createRecord, deleteRecord, getAdminInsights, getAnalystRecords, getDashboardData, getRecordById, updateRecord } from '../controllers/dataController';
import { authenticate } from '../middleware/authenticate';
import { PERMISSIONS, requirePermission } from '../middleware/authorize';

const router = Router();

router.get('/dashboard', authenticate, requirePermission(PERMISSIONS.VIEW_DASHBOARD), getDashboardData);
router.get('/records', authenticate, requirePermission(PERMISSIONS.VIEW_RECORDS), getAnalystRecords);
router.get('/records/:id', authenticate, requirePermission(PERMISSIONS.VIEW_RECORDS), getRecordById);
router.post('/records', authenticate, requirePermission(PERMISSIONS.MANAGE_RECORDS), createRecord);
router.patch('/records/:id', authenticate, requirePermission(PERMISSIONS.MANAGE_RECORDS), updateRecord);
router.delete('/records/:id', authenticate, requirePermission(PERMISSIONS.MANAGE_RECORDS), deleteRecord);
router.get('/insights', authenticate, requirePermission(PERMISSIONS.VIEW_INSIGHTS), getAdminInsights);

export default router;
