import Attendance from '../models/Attendance.js';
import ApprovalRequest from '../models/ApprovalRequest.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import PerformanceLog from '../models/PerformanceLog.js';
import ApiError from '../utils/ApiError.js';

export const getDashboardStats = async () => {
  const totalEmployees = await User.countDocuments({ role: 'EMPLOYEE' });
  const totalGroups = await Group.countDocuments();
  const pendingApprovals = await ApprovalRequest.countDocuments({ status: 'PENDING' });
  
  const today = new Date().toISOString().split('T')[0];
  const todayAttendances = await Attendance.countDocuments({ date: today });

  const allEmployees = await User.find({ role: 'EMPLOYEE' })
    .sort({ performanceScore: -1 })
    .select('name email performanceScore totalPoints groupId createdAt');

  // Enrich with attendance count and points last 7 days trend
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const enriched = await Promise.all(allEmployees.map(async (emp, idx) => {
    const totalAttendance = await Attendance.countDocuments({ userId: emp._id });

    // Sum points for last 7 days vs prior 7 days to compute trend
    const recentPoints = await PerformanceLog.aggregate([
      { $match: { userId: emp._id, date: { $gte: sevenDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);
    const priorPoints = await PerformanceLog.aggregate([
      { $match: { userId: emp._id, date: { $gte: fourteenDaysAgo, $lte: sevenDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);

    const recent = recentPoints[0]?.total ?? 0;
    const prior = priorPoints[0]?.total ?? 0;
    const trend = recent - prior; // positive = uptrend, negative = downtrend

    return {
      _id: emp._id,
      name: emp.name,
      email: emp.email,
      performanceScore: emp.performanceScore,
      totalPoints: emp.totalPoints,
      totalAttendance,
      trend,
      rank: idx + 1,
    };
  }));

  return { 
    totalEmployees, totalGroups, pendingApprovals, todayAttendances, 
    topPerformers: enriched.slice(0, 3),
    leaderboard: enriched,
  };
};

export const getPendingApprovals = async () => {
  return await ApprovalRequest.find({ status: 'PENDING' }).populate('userId', 'name email');
};

export const processApproval = async (requestId, adminId, isApproved) => {
  const request = await ApprovalRequest.findById(requestId);
  if (!request) {
    throw new ApiError(404, 'Approval request not found');
  }
  if (request.status !== 'PENDING') {
    throw new ApiError(400, 'Request already processed');
  }

  const attendance = await Attendance.findById(request.attendanceId);

  const session = await ApprovalRequest.startSession();
  session.startTransaction();

  try {
    request.status = isApproved ? 'APPROVED' : 'REJECTED';
    request.reviewedBy = adminId;
    await request.save({ session });
    
    attendance.approvalStatus = isApproved ? 'APPROVED' : 'REJECTED';
    attendance.status = isApproved ? 'LATE_APPROVED' : 'LATE_REJECTED';
    
    const pointsPenalty = isApproved ? -15 : -25;
    attendance.pointsAwarded = pointsPenalty;
    await attendance.save({ session });

    await PerformanceLog.create([{
      userId: request.userId,
      points: pointsPenalty,
      reason: `Late check-in ${isApproved ? 'Approved' : 'Rejected'} by Admin`
    }], { session });

    await User.findByIdAndUpdate(request.userId, {
      $inc: { performanceScore: pointsPenalty }
    }, { session });

    await session.commitTransaction();
    session.endSession();

    return request;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
