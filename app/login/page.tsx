"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';

type LoginMode = 'account' | 'guest';

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>('account');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLogin(username, password, 'account');
  };

  const handleLogin = async (u: string, p: string, mode: LoginMode) => {
    setError("");
    setIsSubmitting(true);
    setLoginMode(mode);

    try {
      const res = await signIn("credentials", {
        username: u,
        password: p,
        redirect: false,
        callbackUrl: "/",
      });

      if (res?.error) {
        setError("登录失败，请检查用户名或密码");
        return;
      }

      const targetUrl = res?.url || "/";
      router.replace(targetUrl);
      router.refresh();
      window.location.assign(targetUrl);
    } catch {
      setError("登录请求失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = async () => {
    await handleLogin("guest", "guest", 'guest');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white">
      <div className="w-full max-w-md p-8 glass-panel-strong rounded-3xl shadow-2xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="text-2xl font-bold">A</span>
          </div>
          <h1 className="text-2xl font-light tracking-tight">Anime Track</h1>
          <p className="text-zinc-500 text-sm mt-2">登录后开始记录你的追番进度</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" aria-busy={isSubmitting}>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-widest">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              className="surface-input w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-widest">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              className="surface-input w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-mono"
              required
            />
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          {isSubmitting && (
            <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/8 px-4 py-3 text-center text-xs text-emerald-100/90">
              正在验证身份并进入页面，请稍候...
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200 transition-all shadow-lg shadow-white/5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="flex items-center justify-center gap-2">
              {isSubmitting && loginMode === 'account' && <span className="loading-spinner border-black/30 border-t-black" aria-hidden="true" />}
              {isSubmitting && loginMode === 'account' ? '正在进入追番库...' : '进入追番库'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={isSubmitting}
            className="surface-pill w-full py-3 text-zinc-400 rounded-xl font-medium hover:bg-zinc-800 hover:text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="flex items-center justify-center gap-2">
              {isSubmitting && loginMode === 'guest' && <span className="loading-spinner border-zinc-500/40 border-t-zinc-100" aria-hidden="true" />}
              {isSubmitting && loginMode === 'guest' ? '正在以访客身份进入...' : '以访客身份进入'}
            </span>
          </button>

          <div className="text-center mt-6">
            <p className="text-zinc-500 text-sm">
              还没有账号？{" "}
              <Link href="/register" className="text-purple-400 hover:text-purple-300">
                立即注册
              </Link>
            </p>
            <p className="mt-3 text-zinc-500 text-sm">
              本地第一次启动？
              <Link href="/setup" className="ml-1 text-emerald-400 hover:text-emerald-300">
                打开初始化向导 /setup
              </Link>
            </p>
          </div>
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 text-center text-[10px] text-zinc-600 font-mono tracking-widest">
          ANIME_TRACK_v1.0 // SECURE_ACCESS
        </div>
      </div>
    </div>
  );
}
