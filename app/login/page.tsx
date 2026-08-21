"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Sparkles, Wind } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();

  // States للنموذج
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // معالجة تسجيل الدخول / إنشاء الحساب
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        // إنشاء حساب جديد أولاً عن طريق API التسجيل
        const registerRes = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const registerData = await registerRes.json();

        if (!registerRes.ok) {
          setError(registerData.error || "حدث خطأ أثناء إنشاء الحساب");
          setLoading(false);
          return;
        }
      }

      // تسجيل الدخول (سواء بعد إنشاء الحساب أو تسجيل دخول مباشر)
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/",
      });

      if (res?.error) {
        setError("بيانات الدخول غير صحيحة، أو حدث خطأ بالسيرفر");
        setLoading(false);
      } else if (res?.ok) {
        // إعادة التوجيه الصلبة لضمان تحميل Session الكوكيز المحدثة
        window.location.href = res.url || "/";
      }
    } catch (err) {
      setError("حدث خطأ غير متوقع، يرجى المحاولة لاحقاً");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden text-right" dir="rtl">
      {/* خلفيات تفاعلية visual effects */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl z-10"
      >
        {/* الهيدر والشعار */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="relative w-14 h-14 bg-linear-to-tr from-cyan-500 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/20"
          >
            <Wind className="w-7 h-7 text-white animate-pulse" />
            <Sparkles className="w-4 h-4 text-cyan-200 absolute -top-1 -right-1" />
          </motion.div>

          <h1 className="text-3xl font-extrabold text-slate-100 tracking-wider">
            Shaheeq<span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-500">AI</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">
            {isSignUp ? "أنشئ حسابك الجديد للبدء" : "مرحباً بك مجدداً! سجّل دخولك للوصول لحسابك"}
          </p>
        </div>

        {/* عرض رسائل الخطأ إن وجدت */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        {/* أزرار التبديل بين تسجيل الدخول وإنشاء حساب */}
        <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 mb-6 relative">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 z-10 ${
              !isSignUp ? "text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 z-10 ${
              isSignUp ? "text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            إنشاء حساب جديد
          </button>

          <motion.div
            layout
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-linear-to-r from-cyan-500 to-blue-600 rounded-lg shadow-lg"
            animate={{ x: isSignUp ? "-100%" : "0%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>

        {/* النموذج */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {isSignUp && (
              <motion.div
                key="name-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-xs font-medium text-slate-300 mb-1.5">الاسم الكامل</label>
                <div className="relative">
                  <input
                    type="text"
                    required={isSignUp}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="الاسم الثلاثي"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-200"
                  />
                  <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">البريد الإلكتروني</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-200"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-200"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={loading}
            type="submit"
            className="w-full mt-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition duration-200 disabled:opacity-50"
          >
            {loading ? (
              <span className="text-sm">جاري المعالجة...</span>
            ) : (
              <>
                <span className="text-sm">{isSignUp ? "إنشاء الحساب" : "تسجيل الدخول"}</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </>
            )}
          </motion.button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative bg-slate-900 px-3 text-xs text-slate-500">أو المتابعة عبر</span>
        </div>

        {/* زر تسجيل الدخول بحساب Google */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-slate-200 font-medium py-2.5 rounded-xl flex items-center justify-center gap-3 transition duration-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z" />
            <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z" />
          </svg>
          <span className="text-sm">أكمل باستخدام حساب Google</span>
        </motion.button>
      </motion.div>
    </div>
  );
}