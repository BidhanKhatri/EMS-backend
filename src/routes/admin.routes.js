import express from 'express';
import { getDashboard, getApprovals, approveRequest } from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.get('/dashboard', getDashboard);
router.get('/approvals', getApprovals);
router.post('/approve/:id', approveRequest);

export default router;
