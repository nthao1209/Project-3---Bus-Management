import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Settings } from '../models/models';

dotenv.config();

async function initializeSettings() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const existingSetting = await Settings.findOne({ key: 'notification_cron_schedule' });
    
    if (!existingSetting) {
      await Settings.create({
        key: 'notification_cron_schedule',
        value: '*/5 * * * *' // Default: every 5 minutes
      });
      console.log('Created default notification cron schedule: */5 * * * *');
    } else {
      console.log(`Notification cron schedule already exists: ${existingSetting.value}`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error initializing settings:', error);
    process.exit(1);
  }
}

initializeSettings();
