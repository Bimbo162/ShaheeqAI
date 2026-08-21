import mongoose, { Schema, model, models } from "mongoose";

export interface IMemory {
  _id?: string;
  userId: string;
  fact: string;
  category?: string;
  createdAt?: Date;
}

const MemorySchema = new Schema<IMemory>({
  userId: { type: String, required: true, index: true },
  fact: { type: String, required: true },
  category: { type: String, default: "general" },
  createdAt: { type: Date, default: Date.now },
});

export const Memory = models.Memory || model<IMemory>("Memory", MemorySchema);