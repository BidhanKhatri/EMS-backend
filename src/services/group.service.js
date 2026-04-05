import Group from '../models/Group.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

export const createGroup = async (name, adminId) => {
  const existing = await Group.findOne({ name });
  if (existing) {
    throw new ApiError(400, 'Group with this name already exists');
  }
  return await Group.create({ name, createdBy: adminId });
};

export const updateGroup = async (groupId, { name, employees }) => {
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }

  if (name) group.name = name;
  if (employees) {
    group.employees = employees;
    // Bind employees to the group
    await User.updateMany(
      { _id: { $in: employees } },
      { $set: { groupId: group._id } }
    );
  }

  await group.save();
  return group;
};

export const deleteGroup = async (groupId) => {
  const group = await Group.findById(groupId);
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }
  // Free employees
  await User.updateMany({ groupId: group._id }, { $set: { groupId: null } });
  await Group.deleteOne({ _id: groupId });
  return true;
};

export const getGroups = async () => {
  return await Group.find().populate('employees', 'name email');
};
