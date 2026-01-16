import mongoose from "mongoose";
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    throw new Error("Missing environment variable: MONGODB_URI");
}
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = {
        conn: null,
        promise: null,
    };
}
export async function dbConnect() {
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        cached.promise = mongoose
            .connect(MONGODB_URI, {
            dbName: "bus_management", // đổi tên DB nếu cần
        })
            .then((mongoose) => {
            console.log("MongoDB connected");
            return mongoose;
        })
            .catch((err) => {
            console.error("MongoDB connection error:", err);
            throw err;
        });
    }
    cached.conn = await cached.promise;
    return cached.conn;
}
