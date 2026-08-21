import mongoose from "mongoose";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/shaheeq";

if (!MONGODB_URI) {
  throw new Error("رجاء تأكد من إعداد MONGODB_URI داخل ملف .env.local");
}

let cached = (global as any).mongoose || { conn: null, promise: null };

export async function connectToDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}