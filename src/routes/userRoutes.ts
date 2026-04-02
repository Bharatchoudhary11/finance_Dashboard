import { Router } from 'express';
import { createUser, deleteUser, getProfile, getUserById, listUsers, updateUser, updateUserRoles, updateUserStatus } from '../controllers/userController';
import { authenticate } from '../middleware/authenticate';
import { requireRoles } from '../middleware/authorize';
import { ROLES } from '../types/roles';

const router = Router();

router.get('/me', authenticate, getProfile);

router.use(authenticate, requireRoles(ROLES.ADMIN));
router.post('/', createUser);
router.get('/', listUsers);
router.get('/:id', getUserById);
router.patch('/:id', updateUser);
router.patch('/:id/status', updateUserStatus);
router.patch('/:id/roles', updateUserRoles);
router.delete('/:id', deleteUser);

export default router;
