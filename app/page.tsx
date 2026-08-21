"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wind, Sparkles, Plus, Link2, MessageSquare, Trash2, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PatientOnboarding from "@/components/PatientOnboarding";
import { ThemeToggle } from "@/components/ThemeToggle";

type ChatMessage = {
  sender: string;
  text: string;
  sources?: string[];
};

type ConversationSummary = {
  _id: string;
  title: string;
  updatedAt: string;
};

// معالجة وتصحيح رابط المصدر (سواء كان رابط خارجي أو ملف محلي داخل public/knowledge)
const getSourceUrl = (src: string) => {
  if (!src) return "#";
  
  // 1. إذا كان رابطاً خارجيًا صريحًا
  if (/^https?:\/\//i.test(src)) {
    return src;
  }

  // 2. توحيد الشرطات المائلة وإزالة المسارات النسبية (مثل ./ أو ../)
  let normalized = src.replace(/\\/g, "/").replace(/^(\.\/|\.\.\/)+/, "");

  // 3. حذف كلمة public من بداية المسار فقط لأن Next.js يتعامل مع محتوى public كجذر
  normalized = normalized.replace(/^(\/)?public\//i, "");

  // 4. التأكد من وجود / في البداية
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  // 5. ترميز المسار لمعالجة المسافات والرموز الخاصة في أسماء الملفات
  return encodeURI(normalized);
};

// استخراج اسم معروض ونظيف للمرجع
const getSourceLabel = (src: string) => {
  if (!src) return "";
  const normalized = src.replace(/\\/g, "/");
  if (/^https?:\/\//i.test(normalized)) {
    try {
      return new URL(normalized).hostname.replace("www.", "");
    } catch {
      return normalized;
    }
  }
  return normalized.split("/").pop() || normalized;
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showBanner, setShowBanner] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // 1. جلب قائمة المحادثات عند بدء التشغيل
  useEffect(() => {
    if (session?.user) {
      fetchConversations();
    }
  }, [session]);

  // 2. التمرير الذكي لأسفل المحادثة
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error("فشل جلب المحادثات:", err);
    }
  };

  // جلب رسائل محادثة معينة عند الضغط عليها
  const loadConversation = async (id: string) => {
    setActiveConversationId(id);
    setLoading(true);
    setShowBanner(false);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.conversation) {
        setMessages(data.conversation.messages || []);
      }
    } catch (err) {
      console.error("فشل تحميل المحادثة:", err);
    } finally {
      setLoading(false);
    }
  };

  // إنشاء محادثة جديدة
  const handleNewConversation = async () => {
    try {
      const res = await fetch("/api/conversations", { method: "POST" });
      const data = await res.json();
      if (data.conversation) {
        setConversations((prev) => [data.conversation, ...prev]);
        setActiveConversationId(data.conversation._id);
        setMessages([]);
        setInput("");
        setShowBanner(true);
      }
    } catch (err) {
      console.error("فشل إنشاء المحادثة:", err);
    }
  };

  // حذف محادثة
  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
        setShowBanner(true);
      }
    } catch (err) {
      console.error("فشل حذف المحادثة:", err);
    }
  };

  // دالة استقبال بيانات البانر التفاعلي وإرسالها للمساعد
  const handleOnboardingComplete = async (patientInfo: { name: string; age: string; condition: string }) => {
    setShowBanner(false);

    let currentId = activeConversationId;
    if (!currentId) {
      try {
        const res = await fetch("/api/conversations", { method: "POST" });
        const data = await res.json();
        if (data.conversation) {
          currentId = data.conversation._id;
          setActiveConversationId(currentId);
          setConversations((prev) => [data.conversation, ...prev]);
        }
      } catch (err) {
        console.error("فشل إنشاء المحادثة:", err);
        return;
      }
    }

    const introQuery = `أهلاً، أنا اسمي ${patientInfo.name}، وعمري ${patientInfo.age} سنة. ${
      patientInfo.condition ? `حاليًا أعاني من: ${patientInfo.condition}` : ""
    }`;

    const updatedMessages: ChatMessage[] = [...messages, { sender: "user", text: introQuery }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const conversationHistory = updatedMessages.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          conversationId: currentId,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.reply || "مرحباً بك! أنا جاهز ومستعد لمساعدتك.",
          sources: data.sources || [],
        },
      ]);

      fetchConversations();
    } catch (error: any) {
      console.error("خطأ في إرسال بيانات المريض الأولية:", error);
    } finally {
      setLoading(false);
    }
  };

  // إرسال الرسالة العادية
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    let currentId = activeConversationId;

    if (!currentId) {
      try {
        const res = await fetch("/api/conversations", { method: "POST" });
        const data = await res.json();
        if (data.conversation) {
          currentId = data.conversation._id;
          setActiveConversationId(currentId);
          setConversations((prev) => [data.conversation, ...prev]);
        }
      } catch (err) {
        console.error("فشل إنشاء المحادثة التلقائية:", err);
        return;
      }
    }

    const userQuery = input;
    const updatedMessages: ChatMessage[] = [...messages, { sender: "user", text: userQuery }];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setShowBanner(false);

    try {
      const conversationHistory = updatedMessages.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          conversationId: currentId,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.reply || "لم يتم استلام رد من السيرفر.",
          sources: data.sources || [],
        },
      ]);

      fetchConversations();
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: `خطأ اتصال: ${error?.message || "فشل الاتصال بالمسار"}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex items-center justify-center font-cairo">
        جاري التحقق من الجلسة...
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex font-cairo overflow-hidden transition-colors duration-300" dir="rtl">
      {/* Sidebar الجانبي */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 bg-slate-100/80 border-l border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 flex flex-col shrink-0 relative z-20 overflow-hidden`}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={handleNewConversation}
            className="flex-1 flex items-center justify-center gap-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white py-2 px-4 rounded-xl text-xs font-semibold shadow-md transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            محادثة جديدة
          </button>
        </div>

        {/* قائمة المحادثات */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">لا توجد محادثات سابقة</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c._id}
                onClick={() => loadConversation(c._id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-all duration-200 ${
                  activeConversationId === c._id
                    ? "bg-slate-200 text-cyan-600 dark:bg-slate-800 dark:text-cyan-400 font-medium"
                    : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{c.title || "محادثة بدون عنوان"}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, c._id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-all duration-200 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* معلومات المستخدم */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-200/50 dark:bg-slate-950/40">
          <div className="truncate">
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{session.user?.name || "المستخدم"}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{session.user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-red-500 dark:text-red-400 hover:underline transition-colors shrink-0 cursor-pointer"
          >
            خروج
          </button>
        </div>
      </aside>

      {/* المنطقة الرئيسية للشات */}
      <div className="flex-1 flex flex-col h-screen min-w-0">
        {/* Header العلوي */}
        <header className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white/90 dark:bg-slate-950/90 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="relative w-8 h-8 bg-linear-to-tr from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-cyan-500/20 border border-cyan-400/20 shrink-0">
              <Wind className="w-4 h-4 text-white" />
              <Sparkles className="w-2.5 h-2.5 text-cyan-200 absolute -top-0.5 -right-0.5" />
            </div>
            <h1 className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100">
              Shaheeq<span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-500">AI</span>
            </h1>
          </div>

          {/* زر التبديل بين الدارك مود واللايت مود */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* منطقة الرسائل والبانر العلوي */}
        <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl w-full mx-auto">
          {showBanner && messages.length === 0 && (
            <PatientOnboarding onComplete={handleOnboardingComplete} />
          )}

          <AnimatePresence mode="wait">
            {messages.length === 0 && !showBanner ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-3 opacity-90 py-12"
              >
                <div className="relative w-14 h-14 bg-linear-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/20">
                  <Wind className="w-7 h-7 text-white animate-pulse" />
                  <Sparkles className="w-4 h-4 text-cyan-200 absolute -top-1 -right-1" />
                </div>
                <p className="text-sm">
                  أهلاً {session.user?.name?.split(" ")[0] || "بيك"}، كيف يمكنني مساعدتك اليوم؟
                </p>
              </motion.div>
            ) : (
              <motion.div key="messages-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex w-full flex-col ${msg.sender === "user" ? "items-start" : "items-end"}`}
                  >
                    <div
                      className={`max-w-[78%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-xs ${
                        msg.sender === "user"
                          ? "bg-linear-to-br from-cyan-500 to-blue-600 text-white rounded-tr-sm"
                          : "bg-white border border-slate-200 text-slate-900 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800 rounded-tl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>

                    {msg.sender === "bot" && msg.sources && msg.sources.length > 0 && (
                      <div className="max-w-[78%] mt-1.5 flex flex-wrap gap-1.5">
                        {msg.sources.map((src, i) => {
                          const fileUrl = getSourceUrl(src);
                          const label = getSourceLabel(src);
                          return (
                            <a
                              key={i}
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400 bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 px-2.5 py-1 rounded-full hover:underline transition-all"
                            >
                              <Link2 className="w-3 h-3" />
                              {label}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {loading && (
            <div className="flex w-full justify-end">
              <div className="flex items-center gap-2 bg-white border border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 px-4 py-3 rounded-2xl rounded-tl-sm text-xs">
                بيفكر...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </main>

        {/* Footer للإدخال */}
        <footer className="px-4 py-4 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur">
          <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              disabled={loading}
              className="flex-1 bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-full px-5 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 rounded-full text-sm font-medium transition-all text-white cursor-pointer"
            >
              إرسال
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}
