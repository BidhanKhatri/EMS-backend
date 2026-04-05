import catchAsync from '../utils/catchAsync.js';
import * as adminService from '../services/admin.service.js';

export const getDashboard = catchAsync(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  res.status(200).send(stats);
});

export const getApprovals = catchAsync(async (req, res) => {
  const approvals = await adminService.getPendingApprovals();
  res.status(200).send(approvals);
});

export const approveRequest = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isApproved } = req.body;
  const request = await adminService.processApproval(id, req.user.id, isApproved);
  res.status(200).send({
    message: `Request ${isApproved ? 'approved' : 'rejected'} sequentially`,
    request
  });
});
