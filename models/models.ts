import mongoose, { Schema, Document, Model, Types } from 'mongoose';


export interface Station {
  name: string;
  address: string;
  province: string;
  type: 'bus_station' | 'rest_stop' | 'office';
  coords?: {
    lat: number;
    lng: number;
  };
  status?: 'pending' | 'active' | 'rejected';
  creatorId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const StationSchema = new Schema<Station>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  province: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['bus_station', 'rest_stop', 'office'], 
    default: 'bus_station' 
  },
  coords: {
    lat: Number,
    lng: Number
  },
  status: { 
    type: String, 
    enum: ['pending', 'active', 'rejected'], 
    default: 'pending' 
  },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User' },

}, { timestamps: true });



export interface User {
  name: string;
  email: string;
  password?: string; 
  phone: string;
  role: 'user' | 'driver' | 'owner' | 'admin';
  driverLicense?: string;
  isActive: boolean;
  companyId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<User>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['user', 'driver', 'owner', 'admin'], 
    default: 'user' 
  },
  driverLicense: { type: String },
  isActive: { type: Boolean, default: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
}, { timestamps: true });


export interface Company {
  ownerId: Types.ObjectId;
  name: string;
  description?: string;
  hotline: string;
  email?: string;
  address?: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt?: Date;
  updatedAt?: Date;
}

const CompanySchema = new Schema<Company>({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  hotline: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'pending'], 
    default: 'pending' 
  }
}, { timestamps: true });


interface SeatLayout {
  totalSeats: number;
  totalFloors: number;
  schema: any; 
}

export interface Bus {
  companyId: Types.ObjectId;
  plateNumber: string;
  type: string;
  seatLayout: SeatLayout;
  amenities: string[];
  status: 'active' | 'maintenance';
  createdAt?: Date;
  updatedAt?: Date;
}

const BusSchema = new Schema<Bus>({
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

interface RoutePoint {
  name: string;
  address?: string;
  timeOffset?: number;
}

export interface Route {
  companyId: Types.ObjectId;
  name?: string;
  startStationId: Types.ObjectId;
  endStationId: Types.ObjectId;
  distanceKm?: number;
  durationMinutes?: number;
  defaultPickupPoints: RoutePoint[];
  createdAt?: Date;
  updatedAt?: Date;
}

const RouteSchema = new Schema<Route>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String },
  startStationId: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
  endStationId: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
  distanceKm: { type: Number },
  durationMinutes: { type: Number },
  defaultPickupPoints: [{
    name: String,
    address: String,
    timeOffset: Number
  }]
}, { timestamps: true });


interface TripPoint {
  stationId?: Types.ObjectId;
  name: string;
  time: Date;
  surcharge?: number;
}

export interface Trip {
  companyId: Types.ObjectId;
  routeId: Types.ObjectId;
  busId: Types.ObjectId;
  driverId?: Types.ObjectId;
  assistantId?: Types.ObjectId;
  departureTime: Date;
  arrivalTime: Date;
  basePrice: number;
  seatsStatus: Map<string, string>; // Map<Mã ghế, Trạng thái>
  pickupPoints: TripPoint[];
  dropoffPoints: TripPoint[];
  status: 'scheduled' | 'running' | 'completed' | 'cancelled';
  createdAt?: Date;
  updatedAt?: Date;
}

const TripSchema = new Schema<Trip>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  routeId: { type: Schema.Types.ObjectId, ref: 'Route', required: true },
  busId: { type: Schema.Types.ObjectId, ref: 'Bus', required: true },
  driverId: { type: Schema.Types.ObjectId, ref: 'User' }, 
  assistantId: { type: Schema.Types.ObjectId, ref: 'User' },
  departureTime: { type: Date, required: true, index: true },
  arrivalTime: { type: Date, required: true },
  basePrice: { type: Number, required: true },
  seatsStatus: {
    type: Map,
    of: String,
    default: {} 
  },
  pickupPoints: [{
    stationId: { type: Schema.Types.ObjectId, ref: 'Station' },
    name: String,
    time: Date,
    surcharge: { type: Number, default: 0 }
  }],
  dropoffPoints: [{
    stationId: { type: Schema.Types.ObjectId, ref: 'Station' },
    name: String,
    time: Date
  }],
  status: { 
    type: String, 
    enum: ['scheduled', 'running', 'completed', 'cancelled'], 
    default: 'scheduled' 
  }
}, { timestamps: true });

TripSchema.index({ routeId: 1, departureTime: 1 });

// Mẫu lịch trình cố định
export interface TripTemplate {
  companyId: Types.ObjectId;
  routeId: Types.ObjectId;
  busId: Types.ObjectId;
  driverId?: Types.ObjectId;
  
  departureTimeStr: string; // Lưu giờ dạng chuỗi "07:30"
  durationMinutes: number;  // Thời gian chạy (phút)
  
  daysOfWeek: number[]; // [0, 1, 2, 3, 4, 5, 6] (0 là Chủ nhật). Nếu rỗng là chạy hàng ngày.
  
  basePrice: number;
  active: boolean; // Bật/Tắt lịch này
  createdAt?: Date;
}

const TripTemplateSchema = new Schema<TripTemplate>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  routeId: { type: Schema.Types.ObjectId, ref: 'Route', required: true },
  busId: { type: Schema.Types.ObjectId, ref: 'Bus', required: true },
  driverId: { type: Schema.Types.ObjectId, ref: 'User' },
  
  departureTimeStr: { type: String, required: true }, // VD: "08:00"
  durationMinutes: { type: Number, required: true },
  
  daysOfWeek: [{ type: Number }], // Mảng các ngày trong tuần xe chạy
  
  basePrice: { type: Number, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });


interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
}

export interface Booking {
  userId: Types.ObjectId;
  tripId: Types.ObjectId;
  seatCodes: string[];
  totalPrice: number;
  customerInfo: CustomerInfo;
  pickupPoint?: {
    name: string;
    address?: string;
    time?: Date;
  };
  dropoffPoint?: {
    name: string;
    address?: string;
  };
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'boarded';
  paymentExpireAt?: Date;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const BookingSchema = new Schema<Booking>({
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


export interface Payment {
  bookingId: Types.ObjectId;
  userId?: Types.ObjectId;
  amount: number;
  method: 'qr_code' | 'credit_card' | 'cash';
  status: 'pending' | 'success' | 'failed';
  transactionId?: string;
  bankCode?: string;
  paymentDate?: Date;
  qrContent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PaymentSchema = new Schema<Payment>({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['qr_code', 'credit_card', 'cash'], default: 'qr_code' },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  transactionId: { type: String },
  bankCode: { type: String },
  paymentDate: { type: Date },
  qrContent: { type: String } 
}, { timestamps: true });


export interface Notification {
  userId: Types.ObjectId;
  title: string;
  message: string;
  type: 'system' | 'booking' | 'promotion' | 'trip_reminder';
  data?: any;
  isRead: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const NotificationSchema = new Schema<Notification>({
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

export interface GpsLog {
  tripId: Types.ObjectId;
  busId: Types.ObjectId;
  driverId?: Types.ObjectId;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

const GpsLogSchema = new Schema<GpsLog>({
  tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
  busId: { type: Schema.Types.ObjectId, ref: 'Bus', required: true },
  driverId: { type: Schema.Types.ObjectId, ref: 'User' },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  speed: { type: Number },
  heading: { type: Number },
  timestamp: { type: Date, default: Date.now, index: true }
}, { 
  timeseries: {
    timeField: 'timestamp',
    metaField: 'busId',
    granularity: 'seconds'
  },
  expireAfterSeconds: 604800 
});


export const User = mongoose.models.User || mongoose.model<User>('User', UserSchema);
export const Company = mongoose.models.Company || mongoose.model<Company>('Company', CompanySchema);
export const Bus = mongoose.models.Bus || mongoose.model<Bus>('Bus', BusSchema);
export const Station = mongoose.models.Station || mongoose.model<Station>('Station', StationSchema);
export const Route = mongoose.models.Route || mongoose.model<Route>('Route', RouteSchema);
export const Trip = mongoose.models.Trip || mongoose.model<Trip>('Trip', TripSchema);
export const Booking = mongoose.models.Booking || mongoose.model<Booking>('Booking', BookingSchema);
export const Payment = mongoose.models.Payment || mongoose.model<Payment>('Payment', PaymentSchema);
export const Notification = mongoose.models.Notification || mongoose.model<Notification>('Notification', NotificationSchema);
export const GpsLog = mongoose.models.GpsLog || mongoose.model<GpsLog>('GpsLog', GpsLogSchema);
export const TripTemplate = mongoose.models.TripTemplate || mongoose.model<TripTemplate>('TripTemplate', TripTemplateSchema);
