import { Router } from 'express';
import { getAdminInsights, getAnalystRecords, getDashboardData } from '../controllers/dataController';
import { authenticate } from '../middleware/authenticate';
import { requireRoles } from '../middleware/authorize';
import { ROLES } from '../types/roles';

const router = Router();

router.get('/dashboard', authenticate, requireRoles(ROLES.VIEWER), getDashboardData);
router.get('/records', authenticate, requireRoles(ROLES.ANALYST), getAnalystRecords);
router.get('/insights', authenticate, requireRoles(ROLES.ADMIN), getAdminInsights);

export default router;
