import mongoose, { Schema, model, models } from "mongoose";

// 1️⃣ هيكل الرسالة الواحدة
const MessageSchema = new Schema({
  sender: { type: String, enum: ["user", "bot", "assistant"], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// 2️⃣ هيكل جلسة المحادثة (تجمع عدة رسائل معاً)
const ChatSessionSchema = new Schema({
  chatId: { type: String, required: true }, // مُعرّف المحادثة لتسهيل الجلب
  title: { type: String, default: "محادثة جديدة" }, // عنوان المحادثة
  messages: [MessageSchema], // قائمة الرسائل داخل هذه المحادثة
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// 3️⃣ هيكل المريض الرئيسي
const PatientSchema = new Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, select: false },
  image: String,
  medicalHistory: {
    age: Number,
    hasAsthma: Boolean,
    allergies: [String],
    medications: [String],
  },
  chatHistory: [ChatSessionSchema], // أصبحت مصفوفة من جلسات المحادثة
  createdAt: { type: Date, default: Date.now },
});

const Patient = models.Patient || model("Patient", PatientSchema);
export default Patient;