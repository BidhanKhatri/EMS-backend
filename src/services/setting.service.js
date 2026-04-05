import SystemSettings from '../models/SystemSettings.js';
import Holiday from '../models/Holiday.js';
import Attendance from '../models/Attendance.js';
import ApiError from '../utils/ApiError.js';
import { startOfDay, endOfDay, isWeekend, parseISO } from 'date-fns';

export const getSettings = async () => {
  let settings = await SystemSettings.findOne();
  if (!settings) {
    settings = await SystemSettings.create({});
  }
  return settings;
};

export const updateSettings = async (data) => {
  let settings = await SystemSettings.findOne();
  if (!settings) {
    settings = new SystemSettings(data);
  } else {
    Object.assign(settings, data);
  }
  await settings.save();
  return settings;
};

export const getHolidays = async () => {
  return await Holiday.find().sort({ startDate: 1 });
};

export const createHoliday = async (title, startDateStr, endDateStr, adminId) => {
  const startDate = startOfDay(parseISO(startDateStr));
  const endDate = endOfDay(parseISO(endDateStr));

  if (startDate > endDate) {
    throw new ApiError(400, 'Start date must be before end date');
  }

  const holiday = await Holiday.create({
    title,
    startDate,
    endDate,
    createdBy: adminId
  });

  // Retroactive cleanup: removing attendances that fall in this new holiday.
  // We match by `checkInTime` existing within the boundary.
  await Attendance.deleteMany({
    checkInTime: {
      $gte: startDate,
      $lte: endDate
    }
  });

  return holiday;
};

export const deleteHoliday = async (id) => {
  await Holiday.findByIdAndDelete(id);
  return true;
};

// Expose a public/employee endpoint helper to check current status quickly
export const getTodayStatus = async (userId) => {
  const now = new Date();
  const settings = await getSettings();

  if (settings.disableWeekends && isWeekend(now)) {
    return { isHoliday: true, message: 'Today is a Weekend', checkedIn: false };
  }

  const activeHoliday = await Holiday.findOne({
    startDate: { $lte: endOfDay(now) },
    endDate: { $gte: startOfDay(now) }
  });

  if (activeHoliday) {
    return { isHoliday: true, message: activeHoliday.title, checkedIn: false };
  }

  // Also check if employee is checked in already if not a holiday
  const todayString = now.toISOString().split('T')[0];
  const attendance = await Attendance.findOne({ userId, date: todayString });

  return { isHoliday: false, checkedIn: !!attendance };
};
