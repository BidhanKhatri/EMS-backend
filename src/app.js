import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { errorHandler } from './middlewares/error.middleware.js';
import ApiError from './utils/ApiError.js';
import initCronJobs from './jobs/employeeOfMonth.job.js';

import authRoutes from './routes/auth.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import adminRoutes from './routes/admin.routes.js';
import groupRoutes from './routes/group.routes.js';
import settingRoutes from './routes/setting.routes.js';

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();
initCronJobs();

// Security HTTP headers
app.use(helmet());

// Parse generic json and urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors());

// Rate Limiting
const initLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', initLimiter);

// Setup routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/settings', settingRoutes);

app.get('/', (req, res) => {
  res.send('EMS API is running.');
});

// Unknown API routes
app.use((req, res, next) => {
  next(new ApiError(404, 'Not found'));
});

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
