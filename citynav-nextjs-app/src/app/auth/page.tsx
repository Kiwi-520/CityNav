"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { FiLogOut, FiUser, FiMail, FiStar } from "react-icons/fi";

type AuthMode = "login" | "signup";

type CheckUserResponse = {
  exists: boolean;
  hasPassword: boolean;
};

export default function AuthPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const heading = useMemo(
    () => (mode === "login" ? "Login to CityNav" : "Create your CityNav account"),
    [mode],
  );

  const checkUser = async (value: string): Promise<CheckUserResponse | null> => {
    const result = await fetch(`/api/auth/check-user?email=${encodeURIComponent(value)}`);
    if (!result.ok) {
      return null;
    }

    return (await result.json()) as CheckUserResponse;
  };

  const onManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setMessage("Please enter email and password.");
      setLoading(false);
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const userState = await checkUser(normalizedEmail);

      if (!userState) {
        setMessage("Unable to verify account. Please try again.");
        return;
      }

      if (mode === "signup") {
        if (userState.exists) {
          setMessage("User already exists. Please switch to Login.");
          setMode("login");
          return;
        }

        const signupResult = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: normalizedEmail,
            password,
          }),
        });

        const signupData = (await signupResult.json()) as { message?: string };

        if (!signupResult.ok) {
          setMessage(signupData.message ?? "Signup failed.");
          return;
        }
      } else {
        if (!userState.exists) {
          setMessage("No account found for this email. Please sign up first.");
          setMode("signup");
          return;
        }

        if (!userState.hasPassword) {
          setMessage("This account uses Google sign-in. Please continue with Google.");
          return;
        }
      }

      const login = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });

      if (login?.error) {
        setMessage(login.error);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    setMessage("");

    try {
      await signIn("google", { callbackUrl: "/" });
    } finally {
      setLoading(false);
    }
  };

  if (session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-4 py-12 text-white">
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl backdrop-blur">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-emerald-300">CityNav Account</p>
          <h1 className="mb-6 text-3xl font-bold">Your Profile</h1>

          <div className="flex items-center gap-4 mb-6 p-4 bg-white/10 rounded-xl">
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-16 h-16 rounded-full border-2 border-emerald-400" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
                <FiUser size={28} className="text-emerald-300" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold m-0">{session.user.name}</h2>
              <div className="flex items-center gap-1 text-white/70 text-sm mt-1">
                <FiMail size={14} />
                <span>{session.user.email}</span>
              </div>
              {session.user.reputation !== undefined && (
                <div className="flex items-center gap-1 text-amber-300 text-sm mt-1">
                  <FiStar size={14} />
                  <span>Reputation: {session.user.reputation}</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              try { localStorage.removeItem("citynav_user"); } catch {}
              signOut({ callbackUrl: "/" });
            }}
            className="w-full rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3 font-semibold text-red-300 transition hover:bg-red-500/30 cursor-pointer flex items-center justify-center gap-2"
          >
            <FiLogOut size={18} />
            Sign Out
          </button>

          <p className="mt-6 text-sm text-white/70">
            Back to{" "}
            <Link href="/" className="font-semibold text-emerald-300 hover:text-emerald-200">
              Home
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-4 py-12 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl backdrop-blur">
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-emerald-300">CityNav Account</p>
        <h1 className="mb-6 text-3xl font-bold">{heading}</h1>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-white/10 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === "login" ? "bg-white text-slate-900" : "text-white/80"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === "signup" ? "bg-white text-slate-900" : "text-white/80"
            }`}
          >
            Sign Up
          </button>
        </div>

        <button
          type="button"
          onClick={onGoogle}
          disabled={loading}
          className="mb-5 w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 font-semibold transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue with Google
        </button>

        <div className="mb-5 text-center text-xs text-white/70">
          Google flow auto-logs existing users and auto-creates new users.
        </div>

        <form onSubmit={onManualSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none placeholder:text-white/50 focus:border-emerald-300"
              required
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none placeholder:text-white/50 focus:border-emerald-300"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none placeholder:text-white/50 focus:border-emerald-300"
            required
            minLength={8}
          />
          {mode === "signup" && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none placeholder:text-white/50 focus:border-emerald-300"
              required
              minLength={8}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign Up"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-amber-300">{message}</p>}

        <p className="mt-6 text-sm text-white/70">
          Back to{" "}
          <Link href="/" className="font-semibold text-emerald-300 hover:text-emerald-200">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
