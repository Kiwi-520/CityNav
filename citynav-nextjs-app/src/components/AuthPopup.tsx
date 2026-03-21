"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { FiX, FiMail, FiLock, FiUser } from "react-icons/fi";

type AuthMode = "login" | "signup";

type CheckUserResponse = {
  exists: boolean;
  hasPassword: boolean;
};

interface AuthPopupProps {
  onClose: () => void;
  onSuccess: () => void;
  message?: string;
}

export default function AuthPopup({ onClose, onSuccess, message }: AuthPopupProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkUser = async (value: string): Promise<CheckUserResponse | null> => {
    const result = await fetch(`/api/auth/check-user?email=${encodeURIComponent(value)}`);
    if (!result.ok) return null;
    return (await result.json()) as CheckUserResponse;
  };

  const onManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Please enter email and password.");
      setLoading(false);
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const userState = await checkUser(normalizedEmail);
      if (!userState) {
        setError("Unable to verify account. Please try again.");
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        if (userState.exists) {
          setError("Account already exists. Switching to Login.");
          setMode("login");
          setLoading(false);
          return;
        }

        const signupResult = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: normalizedEmail, password }),
        });

        const signupData = (await signupResult.json()) as { message?: string };
        if (!signupResult.ok) {
          setError(signupData.message ?? "Signup failed.");
          setLoading(false);
          return;
        }
      } else {
        if (!userState.exists) {
          setError("No account found. Switching to Sign Up.");
          setMode("signup");
          setLoading(false);
          return;
        }
        if (!userState.hasPassword) {
          setError("This account uses Google sign-in. Please use Google below.");
          setLoading(false);
          return;
        }
      }

      const login = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });

      if (login?.error) {
        setError(login.error);
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: window.location.pathname });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-white/60 hover:text-white bg-transparent border-none cursor-pointer p-1"
        >
          <FiX size={20} />
        </button>

        {/* Header */}
        <p className="mb-1 text-xs uppercase tracking-[0.15em] text-emerald-400">CityNav</p>
        <h2 className="mb-1 text-xl font-bold text-white">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h2>
        {message && (
          <p className="mb-3 text-sm text-amber-300">{message}</p>
        )}

        {/* Mode toggle */}
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition border-none cursor-pointer ${
              mode === "login" ? "bg-white text-slate-900" : "bg-transparent text-white/80"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition border-none cursor-pointer ${
              mode === "signup" ? "bg-white text-slate-900" : "bg-transparent text-white/80"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Google button */}
        <button
          type="button"
          onClick={onGoogle}
          disabled={loading}
          className="mb-3 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60 cursor-pointer"
        >
          <span className="flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </span>
        </button>

        <div className="mb-3 flex items-center gap-2">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-xs text-white/50">or use email</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        {/* Form */}
        <form onSubmit={onManualSubmit} className="space-y-2.5">
          {mode === "signup" && (
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-white/20 bg-white/10 pl-10 pr-4 py-2.5 text-sm text-white outline-none placeholder:text-white/50 focus:border-emerald-400"
                required
              />
            </div>
          )}
          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-white/20 bg-white/10 pl-10 pr-4 py-2.5 text-sm text-white outline-none placeholder:text-white/50 focus:border-emerald-400"
              required
            />
          </div>
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-white/20 bg-white/10 pl-10 pr-4 py-2.5 text-sm text-white outline-none placeholder:text-white/50 focus:border-emerald-400"
              required
              minLength={8}
            />
          </div>
          {mode === "signup" && (
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-xl border border-white/20 bg-white/10 pl-10 pr-4 py-2.5 text-sm text-white outline-none placeholder:text-white/50 focus:border-emerald-400"
                required
                minLength={8}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-60 border-none cursor-pointer"
          >
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign Up"}
          </button>
        </form>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
