import mongoose, { Schema } from 'mongoose';
const StationSchema = new Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    province: { type: String, required: true },
    type: {
        type: String,
        enum: ['bus_station', 'rest_stop', 'office'],
        default: 'bus_station'
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'rejected'],
        default: 'pending'
    },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
StationSchema.index({ name: 1, province: 1, type: 1 }, { unique: true });
const UserSchema = new Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    password: { type: String, required: true },
    phone: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    role: {
        type: String,
        enum: ['user', 'driver', 'owner', 'admin'],
        default: 'user'
    },
    driverLicense: { type: String },
    isActive: { type: Boolean, default: true },
    companyId: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        index: true
    },
}, { timestamps: true });
const CompanySchema = new Schema({
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    description: { type: String },
    hotline: { type: String, required: true },
    email: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    address: { type: String },
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending'],
        default: 'pending'
    }
}, { timestamps: true });
const BusSchema = new Schema({
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    plateNumber: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    seatLayout: {
        totalSeats: { type: Number, required: true },
        totalFloors: { type: Number, default: 1 },
        schema: { type: Schema.Types.Mixed }
    },
    amenities: [String],
    status: { type: String, enum: ['active', 'maintenance'], default: 'active' }
}, { timestamps: true });
const RouteSchema = new Schema({
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String },
    startStationId: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    endStationId: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    distanceKm: { type: Number },
    durationMinutes: { type: Number },
    defaultPickupPoints: [{
            name: { type: String, required: true },
            address: String,
            timeOffset: { type: Number, default: 0 },
        }],
    defaultDropoffPoints: [{
            name: { type: String, required: true },
            address: String,
            timeOffset: { type: Number, default: 0 },
        }]
}, { timestamps: true });
const SeatInfoSchema = new Schema({
    status: {
        type: String,
        enum: ['available', 'holding', 'booked'],
        required: true
    },
    bookingId: {
        type: Schema.Types.ObjectId,
        ref: 'Booking'
    },
    holdExpireAt: {
        type: Date
    },
    socketId: {
        type: String
    }
}, { _id: false });
const TripSchema = new Schema({
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    routeId: { type: Schema.Types.ObjectId, ref: 'Route', required: true },
    busId: { type: Schema.Types.ObjectId, ref: 'Bus', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User' },
    departureTime: { type: Date, required: true, index: true },
    arrivalTime: { type: Date, required: true },
    basePrice: { type: Number, required: true },
    seatsStatus: {
        type: Map,
        of: SeatInfoSchema,
        default: {}
    },
    pickupPoints: [{
            stationId: { type: Schema.Types.ObjectId, ref: 'Station' },
            name: String,
            address: String,
            time: Date,
        }],
    dropoffPoints: [{
            stationId: { type: Schema.Types.ObjectId, ref: 'Station' },
            name: String,
            address: String,
            time: Date,
        }],
    status: {
        type: String,
        enum: ['scheduled', 'running', 'completed', 'cancelled'],
        default: 'scheduled'
    }
}, { timestamps: true });
TripSchema.index({ routeId: 1, departureTime: 1 });
const TripTemplateSchema = new Schema({
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    routeId: { type: Schema.Types.ObjectId, ref: 'Route', required: true },
    busId: { type: Schema.Types.ObjectId, ref: 'Bus', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User' },
    departureTimeStr: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    daysOfWeek: [{ type: Number }], // Mảng các ngày trong tuần xe chạy
    basePrice: { type: Number, required: true },
    active: { type: Boolean, default: true },
    pickupPoints: [{
            stationId: { type: Schema.Types.ObjectId, ref: 'Station' },
            name: String,
            address: String,
            timeOffset: Number,
        }],
    dropoffPoints: [{
            stationId: { type: Schema.Types.ObjectId, ref: 'Station' },
            name: String,
            address: String,
            timeOffset: Number,
        }],
}, { timestamps: true });
const BookingSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    seatCodes: [{ type: String, required: true }],
    totalPrice: { type: Number, required: true },
    customerInfo: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: String
    },
    pickupPoint: {
        name: String,
        address: String,
        time: Date
    },
    dropoffPoint: {
        name: String,
        address: String
    },
    status: {
        type: String,
        enum: ['pending_payment', 'confirmed', 'cancelled', 'boarded'],
        default: 'pending_payment'
    },
    paymentExpireAt: { type: Date },
    note: String
}, { timestamps: true });
// Ngăn 1 ghế bị đặt 2 lần trong cùng 1 chuyến
BookingSchema.index({ tripId: 1, seatCodes: 1 }, { unique: true });
const PaymentSchema = new Schema({
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['offline', 'vnpay'], default: 'vnpay' },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    transactionId: { type: String },
    vnpayTransactionNo: { type: String },
    bankCode: { type: String },
    paymentDate: { type: Date },
    expiresAt: { type: Date },
    qrContent: { type: String }
}, { timestamps: true });
const NotificationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ['system', 'booking', 'promotion', 'trip_reminder'],
        default: 'system'
    },
    data: { type: Object },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });
const SettingsSchema = new Schema({
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
const ReviewSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 300 },
}, { timestamps: true });
// 1 user chỉ review 1 lần / 1 trip
ReviewSchema.index({ userId: 1, tripId: 1 }, { unique: true });
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Company = mongoose.models.Company || mongoose.model('Company', CompanySchema);
export const Bus = mongoose.models.Bus || mongoose.model('Bus', BusSchema);
export const Station = mongoose.models.Station || mongoose.model('Station', StationSchema);
export const Route = mongoose.models.Route || mongoose.model('Route', RouteSchema);
export const Trip = mongoose.models.Trip || mongoose.model('Trip', TripSchema);
export const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
export const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export const TripTemplate = mongoose.models.TripTemplate || mongoose.model('TripTemplate', TripTemplateSchema);
export const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
export const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
