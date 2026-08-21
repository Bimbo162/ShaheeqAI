import mongoose, { Schema, model, models } from "mongoose";

// 1. تحديد نوع الرسالة داخل المحادثة
export interface IMessage {
  sender: "user" | "bot";
  text: string;
  sources?: string[];
  createdAt?: Date;
}

// 2. تحديد نوع المحادثة
export interface IConversation {
  _id?: string;
  userId: string;
  title: string;
  messages: IMessage[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Schema للرسالة المنفردة
const MessageSchema = new Schema<IMessage>({
  sender: { type: String, enum: ["user", "bot"], required: true },
  text: { type: String, required: true },
  sources: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

// Schema للمحادثة الكاملة
const ConversationSchema = new Schema<IConversation>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, default: "محادثة جديدة" },
    messages: [MessageSchema],
  },
  {
    timestamps: true, // يضيف حقول createdAt و updatedAt تلقائياً
  }
);

export const Conversation =
  models.Conversation || model<IConversation>("Conversation", ConversationSchema);