const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse-fork");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");

const folder = path.join(__dirname, "../knowledge/guidelines");

async function processPDFs() {
  const files = fs.readdirSync(folder);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  for (const file of files) {
    if (!file.endsWith(".pdf")) continue;

    console.log(`\n====================================`);
    console.log(`Processing File: ${file}`);

    const dataBuffer = fs.readFileSync(path.join(folder, file));
    
    // استخراج النص من PDF
    const data = await pdf(dataBuffer);

    // تقسيم النص لـ Chunks
    const chunks = await splitter.splitText(data.text);

    console.log(`Total Chunks Generated: ${chunks.length}`);
    console.log(`--- Sample Chunk 1 ---`);
    console.log(chunks[0]);
  }
}

processPDFs().catch(console.error);