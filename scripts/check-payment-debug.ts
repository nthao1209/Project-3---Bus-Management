// Script để debug payment status
// Chạy: node --loader ts-node/esm scripts/check-payment-debug.ts

import { dbConnect } from '../lib/dbConnect.js';
import { Payment, Booking } from '../models/models.js';

async function checkPaymentStatus() {
  try {
    await dbConnect();
    
    // Tìm payment có transactionId = 09003828 (từ logs)
    const txnRef = '09003828';
    
    console.log(`\n🔍 Tìm payment với txnRef: ${txnRef}`);
    const payment = await Payment.findOne({ transactionId: txnRef });
    
    if (!payment) {
      console.log('❌ Không tìm thấy payment');
      process.exit(0);
    }
    
    console.log('\n📦 Payment Info:');
    console.log('  _id:', payment._id);
    console.log('  bookingId:', payment.bookingId);
    console.log('  status:', payment.status);
    console.log('  amount:', payment.amount);
    console.log('  method:', payment.method);
    console.log('  vnpayTransactionNo:', payment.vnpayTransactionNo);
    console.log('  createdAt:', payment.createdAt);
    console.log('  expiresAt:', payment.expiresAt);
    
    console.log('\n🎫 Booking Info:');
    const booking = await Booking.findById(payment.bookingId);
    if (booking) {
      console.log('  _id:', booking._id);
      console.log('  status:', booking.status);
      console.log('  seatCodes:', booking.seatCodes);
      console.log('  tripId:', booking.tripId);
      console.log('  userId:', booking.userId);
    } else {
      console.log('  ❌ Booking not found');
    }
    
    // Nếu payment success nhưng booking vẫn pending -> fix
    if (payment.status === 'success' && booking?.status !== 'confirmed') {
      console.log('\n⚠️ INCONSISTENT STATE DETECTED!');
      console.log('  Payment is SUCCESS but Booking is', booking?.status);
      console.log('  Need to run reconciliation...');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPaymentStatus();
