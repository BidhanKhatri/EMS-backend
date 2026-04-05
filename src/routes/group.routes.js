import express from 'express';
import { createGroup, updateGroup, deleteGroup, getGroups } from '../controllers/group.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.get('/', getGroups);
router.post('/', createGroup);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

export default router;
