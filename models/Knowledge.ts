import mongoose, { Schema, models } from "mongoose";

const KnowledgeSchema = new Schema({
  source: { type: String, required: true },
  content: { type: String, required: true },
  embedding: { type: [Number], required: true },
}, { timestamps: true });

export default models.Knowledge || mongoose.model("Knowledge", KnowledgeSchema);