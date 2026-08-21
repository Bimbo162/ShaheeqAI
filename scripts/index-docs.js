const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { PDFParse } = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

// دالة توليد الـ embedding باستخدام Gemini بدلاً من xenova
async function getEmbedding(text) {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Error generating embedding with Gemini:", error);
    return new Array(768).fill(0);
  }
}

async function main() {
  console.log("🔄 جاري الاتصال بقاعدة البيانات والتحضير...");
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
      const embedding = await getEmbedding(chunk);

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