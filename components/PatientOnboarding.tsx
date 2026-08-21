"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Calendar, Stethoscope, Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";

interface OnboardingProps {
  onComplete: (patientInfo: { name: string; age: string; condition: string }) => void;
}

export default function PatientOnboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [info, setInfo] = useState({ name: "", age: "", condition: "" });

  const questions = [
    {
      id: "name",
      title: "أهلاً بك! أنا مساعدك الطبي الذكي 🩺",
      subtitle: "عشان أقدر أساعدك بشكل أفضل، حابب اعرف اسمك الكريم؟",
      icon: <User className="w-8 h-8 text-blue-500" />,
      placeholder: "اكتب اسمك هنا...",
      type: "text",
    },
    {
      id: "age",
      title: "أهلاً بك يا " + (info.name || "صديقي") + " 👋",
      subtitle: "عندك كام سنة؟ (معرفة العمر بتساعدنا في تقديم استشارات أدق)",
      icon: <Calendar className="w-8 h-8 text-green-500" />,
      placeholder: "مثال: 25",
      type: "number",
    },
    {
      id: "condition",
      title: "سؤال أخير سريع 📋",
      subtitle: "هل بتعاني من أي أمراض مزمنة أو مشاكل تنفسية زي الربو؟",
      icon: <Stethoscope className="w-8 h-8 text-purple-500" />,
      placeholder: "مثال: حساسية في الصدر / ربو / لا يوجد",
      type: "text",
    },
  ];

  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      // عند الانتهاء يتم إرسال البيانات
      onComplete(info);
    }
  };

  const currentQ = questions[step];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 mb-6 shadow-xl border border-blue-500/20">
      {/* 🌟 الخلفية المضيئة والأنيميشن الخلفي */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* 🤖 جهة الأنيميشن والرمز التفاعلي */}
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600/30 border border-blue-400/30 backdrop-blur-md shadow-inner"
          >
            <Sparkles className="w-10 h-10 text-blue-300 animate-spin-slow" />
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </motion.div>

          <div className="space-y-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              التعرف على المريض ({step + 1} من {questions.length})
            </span>
            <h3 className="text-xl font-bold">{currentQ.title}</h3>
            <p className="text-sm text-gray-300 max-w-md">{currentQ.subtitle}</p>
          </div>
        </div>

        {/* 📝 جهة إدخال البيانات والزر */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <input
              type={currentQ.type}
              value={info[currentQ.id as keyof typeof info]}
              onChange={(e) => setInfo({ ...info, [currentQ.id]: e.target.value })}
              placeholder={currentQ.placeholder}
              onKeyDown={(e) => e.key === "Enter" && handleNext()}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-sm transition-all"
            />
          </div>

          <button
            onClick={handleNext}
            disabled={!info[currentQ.id as keyof typeof info]}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/30"
          >
            <span>{step === questions.length - 1 ? "حفظ وإرسال" : "التالي"}</span>
            {step === questions.length - 1 ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <ArrowLeft className="w-4 h-4" />
            )}
          </button>
        </div>

      </div>

      {/* 📊 شريط التقدم (Progress Bar) */}
      <div className="w-full bg-white/10 h-1.5 rounded-full mt-6 overflow-hidden">
        <motion.div
          className="bg-linear-to-r from-blue-400 to-purple-400 h-full"
          initial={{ width: "0%" }}
          animate={{ width: `${((step + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}