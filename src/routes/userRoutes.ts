import { Router } from 'express';
import { createUser, getProfile, listUsers, updateUserRoles, updateUserStatus } from '../controllers/userController';
import { authenticate } from '../middleware/authenticate';
import { requireRoles } from '../middleware/authorize';
import { ROLES } from '../types/roles';

const router = Router();

router.get('/me', authenticate, getProfile);

router.use(authenticate, requireRoles(ROLES.ADMIN));
router.post('/', createUser);
router.get('/', listUsers);
router.patch('/:id/status', updateUserStatus);
router.patch('/:id/roles', updateUserRoles);

export default router;
