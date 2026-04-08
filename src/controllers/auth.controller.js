import catchAsync from '../utils/catchAsync.js';
import * as authService from '../services/auth.service.js';

export const register = catchAsync(async (req, res) => {
  const user = await authService.registerUser(req.body);
  res.status(201).send({
    code: 201,
    message: 'User registered successfully. Please check terminal (mock email) for verification token.',
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = authService.generateTokens(user.id, user.role);
  
  res.send({ 
    user: { id: user._id, name: user.name, email: user.email, role: user.role, performanceScore: user.performanceScore }, 
    tokens 
  });
});

export const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  res.send({ code: 200, message: 'Email verified successfully. You can now login.' });
});

export const getProfile = catchAsync(async (req, res) => {
  const user = req.user;
  res.send({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      performanceScore: user.performanceScore,
    },
  });
});

export const updateProfile = catchAsync(async (req, res) => {
  const updatedUser = await authService.updateUserProfile(req.user.id, req.body);

  res.send({
    code: 200,
    message: 'Profile updated successfully',
    user: {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      performanceScore: updatedUser.performanceScore,
    },
  });
});
