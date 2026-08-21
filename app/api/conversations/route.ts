import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { Conversation } from "@/models/Conversation";

async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
  }
}

// 1. جلب جميع محادثات المستخدم لعرضها في الـ Sidebar
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    await connectDB();

    // جلب عناوين المحادثات وتاريخها فقط لتخفيف الحجم (دون الرسائل) مرتبة للأحدث
    const conversations = await Conversation.find(
      { userId: session.user.email },
      { title: 1, updatedAt: 1 }
    ).sort({ updatedAt: -1 });

    return NextResponse.json({ conversations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. إنشاء محادثة جديدة فارغة عند الضغط على زر "+ محادثة جديدة"
export async function POST() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    await connectDB();

    const newConversation = await Conversation.create({
      userId: session.user.email,
      title: "محادثة جديدة",
      messages: [],
    });

    return NextResponse.json({ conversation: newConversation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}