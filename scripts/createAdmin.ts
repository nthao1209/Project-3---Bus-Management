import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/models.ts';

async function createAdmin() {
  const {
    MONGODB_URI,
    ADMIN_NAME,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    ADMIN_PHONE,
  } = process.env;

  if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_PHONE) {
    console.error('Thiếu biến môi trường (.env)');
    process.exit(1);
  }

  try {
    // 1. Kết nối DB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected MongoDB');

    // 2. Kiểm tra admin đã tồn tại chưa
    const existingAdmin = await User.findOne({
      email: ADMIN_EMAIL.toLowerCase(),
    });

    if (existingAdmin) {
      console.log('Admin đã tồn tại:', existingAdmin.email);
      process.exit(0);
    }

    // 3. Hash mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // 4. Tạo admin
    await User.create({
      name: ADMIN_NAME || 'System Admin',
      email: ADMIN_EMAIL.toLowerCase(),
      password: hashedPassword,
      phone: ADMIN_PHONE,
      role: 'admin',
      isActive: true,
    });

    console.log('Tạo ADMIN thành công:', ADMIN_EMAIL);
    process.exit(0);
  } catch (error) {
    console.error('Lỗi tạo admin:', error);
    process.exit(1);
  }
}

createAdmin();
