import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Knowledge from "@/models/Knowledge";
import { Memory } from "@/models/Memory"; 
import Patient from "@/models/Patient"; 
import { embedText, cosineSimilarity } from "@/lib/embeddings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function cleanResponse(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
  }
}

async function getRelevantContext(
  message: string,
  topK = 4
): Promise<{ contextText: string; sources: string[] }> {
  await connectDB();

  const queryEmbedding = await embedText(message);
  const allChunks = await Knowledge.find({}, { content: 1, embedding: 1, source: 1 }).lean();

  const scored = allChunks.map((chunk: any) => ({
    content: chunk.content,
    source: chunk.source,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  const topChunks = scored.slice(0, topK).filter((c) => c.score > 0.3);

  if (topChunks.length === 0) return { contextText: "", sources: [] };

  const contextText = topChunks
    .map((c) => `[مصدر: ${c.source}]\n${c.content}`)
    .join("\n\n---\n\n");

  const sources = Array.from(new Set(topChunks.map((c) => c.source)));

  return { contextText, sources };
}

// دالة استخراج وتخزين الذكريات في الخلفية
async function extractAndSaveMemory(apiKey: string, userId: string, userMessage: string) {
  if (!userMessage || userMessage.trim().length < 8) return;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const extractionPrompt = `
أنت جزء من نظام ذكاء اصطناعي. حلل الرسالة التالية واستخرج منها فقط الحقائق المستمرة الخاصة بالمريض مثل (الاسم، العمر، الوظيفة، التشخيص المسبق، مسببات الحساسية عنده، الأدوية التي يستخدمها، المشاكل النفسية/الجسدية المزمنة).
إذا لم توجد أي معلومة شخصية أو طبية مهمة تستحق الحفظ، أرجع فقط كلمة "NONE".

الرسالة: "${userMessage}"
المعلومة الاستخراجية (سطر واحد فقط بدون مقدمات):`;

    const result = await model.generateContent(extractionPrompt);
    const extractedFact = result.response.text().trim();

    if (extractedFact && !extractedFact.includes("NONE")) {
      await connectDB();
      await Memory.create({
        userId,
        fact: cleanResponse(extractedFact),
      });
    }
  } catch (err) {
    console.error("⚠️ خطأ في حفظ الذاكرة:", err);
  }
}

// دالة حفظ المحادثة بداخل Patient في MongoDB
async function saveChatToPatientHistory(
  userEmail: string,
  chatId: string,
  userMessage: string,
  botReply: string
) {
  try {
    await connectDB();

    const updated = await Patient.findOneAndUpdate(
      { email: userEmail, "chatHistory.chatId": chatId },
      {
        $push: {
          "chatHistory.$.messages": {
            $each: [
              { sender: "user", text: userMessage, timestamp: new Date() },
              { sender: "bot", text: botReply, timestamp: new Date() },
            ],
          },
        },
        $set: { "chatHistory.$.updatedAt": new Date() },
      },
      { new: true }
    );

    if (!updated) {
      const titleText = userMessage.trim().slice(0, 30) + (userMessage.length > 30 ? "..." : "");
      
      await Patient.findOneAndUpdate(
        { email: userEmail },
        {
          $push: {
            chatHistory: {
              chatId: chatId,
              title: titleText || "محادثة جديدة",
              messages: [
                { sender: "user", text: userMessage, timestamp: new Date() },
                { sender: "bot", text: botReply, timestamp: new Date() },
              ],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        }
      );
    }
    console.log(`✅ تم حفظ المحادثة لـ: ${userEmail}`);
  } catch (err) {
    console.error("⚠️ خطأ في حفظ المحادثة بـ MongoDB:", err);
  }
}

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { email?: string } } | null;
    const userEmail = session?.user?.email;
    const userId = userEmail || "anonymous_user";

    const body = await req.json();
    const conversationMessages: Array<{ role: string; content: string }> = body.messages || [];
    const chatId = body.chatId || `chat_${Date.now()}`;

    if (conversationMessages.length === 0) {
      return NextResponse.json({ reply: "لم يتم استلام أي رسالة." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: "مفتاح GEMINI_API_KEY غير متوفر" }, { status: 500 });
    }

    const lastUserMessage = [...conversationMessages].reverse().find((m) => m.role === "user")?.content || "";

    let userMemoriesText = "";
    try {
      await connectDB();
      const userMemories = await Memory.find({ userId });
      if (userMemories.length > 0) {
        userMemoriesText = userMemories.map((m) => `- ${m.fact}`).join("\n");
      }
    } catch (memError) {
      console.error("⚠️ خطأ في جلب الذاكرة:", memError);
    }

    let context = "";
    let sources: string[] = [];
    try {
      const result = await getRelevantContext(lastUserMessage);
      context = result.contextText;
      sources = result.sources;
    } catch (ragError: any) {
      console.error("⚠️ خطأ في البحث عن المعرفة (RAG):", ragError);
    }

    const baseInstructions = `أنت مساعد طبي افتراضي متخصص في أمراض الجهاز التنفسي (خصوصًا الربو)، تتحدث بأسلوب طبيعي ومختصر زي ما يتكلم طبيب حقيقي مع مريضه.

حقائق مسجلة عن هذا المريض من محادثات سابقة:
${userMemoriesText || "لا توجد ذكريات سابقة."}

قواعد أساسية:
- رد بجملة أو جملتين بس في كل مرة، مش مقال طويل.
- لو المريض وصف عرض غامض، اسأله سؤال متابعة واحد بس.
- استخدم كل تاريخ المحادثة السابق ومتكررش سؤال سبق وسألته.
- لا تستخدم رسائل الطوارئ إلا لو المريض أكد أعراض خطيرة فعلاً.`;

    const systemPrompt = context
      ? `${baseInstructions}\n\nاستخدم المعلومات التالية من المصادر الطبية الموثوقة:\n\n${context}`
      : baseInstructions;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const historyMessages = conversationMessages.slice(0, -1);
    const currentMessage = conversationMessages[conversationMessages.length - 1];

    const history = historyMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 2048,
        topP: 0.95,
      },
    });

    let rawReply = "عذراً، لم أستطع توليد رد.";
    try {
      const result = await chat.sendMessage(currentMessage.content);
      rawReply = result.response.text() || rawReply;
    } catch (genError: any) {
      console.error("⚠️ خطأ في توليد الرد من Gemini:", genError);
      return NextResponse.json(
        { reply: `خطأ من Gemini: ${genError?.message || "فشل الاتصال"}` },
        { status: 500 }
      );
    }

    const reply = cleanResponse(rawReply);

    if (userEmail) {
      await saveChatToPatientHistory(userEmail, chatId, lastUserMessage, reply);
    } else {
      console.warn("⚠️ لم يتم حفظ المحادثة لأن المستخدم غير مسجل دخول (No Session Email)");
    }

    extractAndSaveMemory(apiKey, userId, lastUserMessage);

    return NextResponse.json({ reply, sources, chatId });
  } catch (error: any) {
    console.error("❌ خطأ سيرفر داخلي مفصل في API Chat:", error);
    return NextResponse.json(
      { reply: `خطأ سيرفر داخلي: ${error?.message || "مشكلة غير معروفة"}` },
      { status: 500 }
    );
  }
}