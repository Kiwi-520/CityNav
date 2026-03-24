"use client";

import { FormEvent, useMemo, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { FiLogOut, FiUser, FiMail, FiStar } from "react-icons/fi";

type AuthMode = "login" | "signup";

type CheckUserResponse = {
  exists: boolean;
  hasPassword: boolean;
};

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent mb-3" />
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Handle NextAuth error redirects (e.g., Google login failures)
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      const errorMessages: Record<string, string> = {
        OAuthSignin: "Could not start Google sign-in. Please try again.",
        OAuthCallback: "Google sign-in failed. Please try again or use email/password.",
        OAuthCreateAccount: "Could not create account with Google. Try signing up with email.",
        OAuthAccountNotLinked: "This email is already registered with a different sign-in method.",
        Callback: "Sign-in failed. Please try again.",
        Default: "An authentication error occurred. Please try again.",
        Configuration: "Server configuration error. Google sign-in may be temporarily unavailable. Please try email/password login.",
      };
      setMessage(errorMessages[error] || errorMessages.Default);
    }
  }, [searchParams]);

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
      // redirect: true causes a full page redirect to Google OAuth
      // Errors will be handled via the error search param on redirect back
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setMessage("Google sign-in is temporarily unavailable. Please try email/password login.");
      setLoading(false);
    }
  };

  if (session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-3 sm:px-4 py-8 sm:py-12 text-white">
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-6 shadow-xl backdrop-blur overflow-hidden">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-emerald-300">CityNav Account</p>
          <h1 className="mb-6 text-2xl sm:text-3xl font-bold">Your Profile</h1>

          <div className="flex items-center gap-4 mb-6 p-4 bg-white/10 rounded-xl overflow-hidden">
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-emerald-400 flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center flex-shrink-0">
                <FiUser size={24} className="text-emerald-300" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold m-0 truncate">{session.user.name}</h2>
              <div className="flex items-center gap-1 text-white/70 text-sm mt-1 min-w-0">
                <FiMail size={14} className="flex-shrink-0" />
                <span className="truncate">{session.user.email}</span>
              </div>
              {session.user.reputation !== undefined && (
                <div className="flex items-center gap-1 text-amber-300 text-sm mt-1">
                  <FiStar size={14} className="flex-shrink-0" />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-3 sm:px-4 py-8 sm:py-12 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-6 shadow-xl backdrop-blur overflow-hidden">
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-emerald-300">CityNav Account</p>
        <h1 className="mb-6 text-2xl sm:text-3xl font-bold">{heading}</h1>

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
