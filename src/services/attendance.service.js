import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import ApprovalRequest from '../models/ApprovalRequest.js';
import PerformanceLog from '../models/PerformanceLog.js';
import ApiError from '../utils/ApiError.js';
import { format } from 'date-fns';

import { getTodayStatus, getSettings } from './setting.service.js';

const addPerformancePoints = async (userId, points, reason, session) => {
  await PerformanceLog.create([{ userId, points, reason }], { session });
  await User.findByIdAndUpdate(userId, { 
    $inc: { performanceScore: points, totalPoints: points > 0 ? points : 0 }
  }, { session });
};

export const checkIn = async (userId) => {
  const statusCheck = await getTodayStatus(userId);
  if (statusCheck.isHoliday) {
    throw new ApiError(400, `Cannot check in. Today is a holiday: ${statusCheck.message}`);
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  
  const existingAttendance = await Attendance.findOne({ userId, date: today });
  if (existingAttendance) {
    throw new ApiError(400, 'Already checked in today');
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  const settings = await getSettings();
  // settings.checkInTime is like "09:00"
  const [targetH, targetM] = settings.checkInTime.split(':').map(Number);
  const targetTimeInMinutes = targetH * 60 + targetM;

  const T_EARLY_LOWER = targetTimeInMinutes - settings.earlyMargin;
  const T_ON_TIME = targetTimeInMinutes;
  const T_LATE_BOUND = targetTimeInMinutes + settings.lateMargin;

  let status;
  let pointsAwarded = 0;
  let needsApproval = false;

  if (currentTimeInMinutes < T_EARLY_LOWER) {
    throw new ApiError(400, `Too early to check-in. Please wait until ${Math.floor(T_EARLY_LOWER / 60)}:${String(T_EARLY_LOWER % 60).padStart(2, '0')}.`);
  } else if (currentTimeInMinutes >= T_EARLY_LOWER && currentTimeInMinutes <= T_ON_TIME) {
    status = 'EARLY';
    pointsAwarded = 10;
  } else if (currentTimeInMinutes > T_ON_TIME && currentTimeInMinutes <= T_LATE_BOUND) {
    status = 'LATE';
    pointsAwarded = -5;
  } else {
    status = 'PENDING_APPROVAL';
    needsApproval = true;
  }

  const session = await Attendance.startSession();
  session.startTransaction();

  try {
    const attendance = await Attendance.create([{
      userId,
      date: today,
      checkInTime: now,
      status,
      pointsAwarded: needsApproval ? 0 : pointsAwarded,
      approvalStatus: needsApproval ? 'PENDING' : 'NONE'
    }], { session });

    if (!needsApproval && pointsAwarded !== 0) {
      await addPerformancePoints(userId, pointsAwarded, `Check-in status: ${status}`, session);
    }

    if (needsApproval) {
      await ApprovalRequest.create([{
        userId,
        attendanceId: attendance[0]._id,
        reason: 'Late check-in after 9:05 AM'
      }], { session });
    }

    await session.commitTransaction();
    session.endSession();

    return attendance[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const checkOut = async (userId) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const attendance = await Attendance.findOne({ userId, date: today });
  
  if (!attendance) {
    throw new ApiError(400, 'Cannot check out without checking in');
  }
  
  if (attendance.checkOutTime) {
    throw new ApiError(400, 'Already checked out today');
  }

  attendance.checkOutTime = new Date();
  await attendance.save();
  return attendance;
};

export const getMyAttendance = async (userId) => {
  return await Attendance.find({ userId }).sort({ date: -1 });
};

export const getMyPerformance = async (userId) => {
  return await PerformanceLog.find({ userId }).sort({ date: 1 }); // Ascending for time-series charts
};
