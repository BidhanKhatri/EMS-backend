import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

export const generateTokens = (userId, role) => {
  const payload = { sub: userId, role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: `${process.env.JWT_ACCESS_EXPIRATION_MINUTES}m`,
  });
  return { accessToken };
};

export const registerUser = async (userData) => {
  if (await User.findOne({ email: userData.email })) {
    throw new ApiError(400, 'Email already taken');
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');

  const user = await User.create({
    ...userData,
    verificationToken,
  });

  // Mock sending email
  console.log(`\n=== EMAIL MOCK ===\nTo: ${user.email}\nSubject: Verify Email\nToken: ${verificationToken}\n==================\n`);

  return user;
};

export const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(401, 'Incorrect email or password');
  }
  
  if (!user.isVerified) {
    throw new ApiError(403, 'Please verify your email before logging in');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated');
  }

  return user;
};

export const verifyEmail = async (token) => {
  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    throw new ApiError(400, 'Invalid or expired verification token');
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save();

  return user;
};

export const updateUserProfile = async (userId, updates) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (updates.email && updates.email !== user.email) {
    const existingUser = await User.findOne({ email: updates.email });
    if (existingUser && existingUser.id !== user.id) {
      throw new ApiError(400, 'Email already taken');
    }
    user.email = updates.email;
  }

  if (updates.name) {
    user.name = updates.name;
  }

  await user.save();
  return user;
};
