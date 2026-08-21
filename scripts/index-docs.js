const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { PDFParse } = require("pdf-parse");
require("dotenv").config({ path: ".env.local" });

const KnowledgeSchema = new mongoose.Schema({
  source: String,
  content: String,
  embedding: [Number],
}, { timestamps: true });

const Knowledge = mongoose.models.Knowledge || mongoose.model("Knowledge", KnowledgeSchema);

// مجلد المعرفة اللي فيه كل المجلدات الفرعية (articles, books, guidelines)
const KNOWLEDGE_DIR = path.join(__dirname, "..", "knowledge");

// دالة تدور على كل الملفات جوه مجلد وكل المجلدات الفرعية بتاعته
function getAllFiles(dirPath, allFiles = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, allFiles);
    } else if ([".pdf", ".txt", ".md"].includes(path.extname(entry.name).toLowerCase())) {
      allFiles.push(fullPath);
    }
  }
  return allFiles;
}

// تقسيم النص لأجزاء صغيرة (chunks) مع تداخل بسيط
function chunkText(text, chunkSize = 800, overlap = 150) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    start += chunkSize - overlap;
  }
  return chunks.filter(c => c.length > 50);
}

async function readFileContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text;
  } else if (ext === ".txt" || ext === ".md") {
    return fs.readFileSync(filePath, "utf-8");
  }
  return null;
}

async function main() {
  console.log("🔄 جاري تحميل نموذج الـ embeddings...");
  const { pipeline } = await import("@xenova/transformers");
  const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

  console.log("🔗 جاري الاتصال بقاعدة البيانات...");
  await mongoose.connect(process.env.MONGODB_URI);

  const filePaths = getAllFiles(KNOWLEDGE_DIR);
  console.log(`📚 لقيت ${filePaths.length} ملف`);

  for (const filePath of filePaths) {
    const relativeName = path.relative(KNOWLEDGE_DIR, filePath);
    console.log(`📖 جاري معالجة: ${relativeName}`);
    const text = await readFileContent(filePath);
    if (!text) continue;

    const chunks = chunkText(text);
    console.log(`   → ${chunks.length} جزء`);

    for (const chunk of chunks) {
      const output = await embedder(chunk, { pooling: "mean", normalize: true });
      const embedding = Array.from(output.data);

      await Knowledge.create({
        source: relativeName,
        content: chunk,
        embedding,
      });
    }
  }

  console.log("✅ تم فهرسة كل الملفات بنجاح");
  await mongoose.disconnect();
}

main().catch(err => {
  console.error("❌ خطأ:", err);
  process.exit(1);
});