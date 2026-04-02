import { Router } from 'express';
import { createRecord, getAdminInsights, getAnalystRecords, getDashboardData, updateRecord } from '../controllers/dataController';
import { authenticate } from '../middleware/authenticate';
import { requireRoles } from '../middleware/authorize';
import { ROLES } from '../types/roles';

const router = Router();

router.get('/dashboard', authenticate, requireRoles(ROLES.VIEWER), getDashboardData);
router.get('/records', authenticate, requireRoles(ROLES.ANALYST), getAnalystRecords);
router.post('/records', authenticate, requireRoles(ROLES.ADMIN), createRecord);
router.patch('/records/:id', authenticate, requireRoles(ROLES.ADMIN), updateRecord);
router.get('/insights', authenticate, requireRoles(ROLES.ADMIN), getAdminInsights);

export default router;
