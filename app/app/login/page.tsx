"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Delete } from "lucide-react";

import { T } from "@/lib/theme";

const PIN_LENGTH = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit(value: string) {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: value }),
    });

    setLoading(false);

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/"), 480);
    } else {
      setPin("");
      setError("Incorrect PIN");
      setShake(true);
    }
  }

  // Clear shake after animation
  useEffect(() => {
    if (!shake) return;
    const t = setTimeout(() => setShake(false), 500);
    return () => clearTimeout(t);
  }, [shake]);

  function press(key: string) {
    if (loading || success) return;
    if (key === "del") {
      setPin(p => p.slice(0, -1));
      setError(null);
      return;
    }
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    setPin(next);
    if (next.length === PIN_LENGTH) submit(next);
  }

  const fadeOut: React.CSSProperties | undefined = success
    ? { animation: "mr-login-fade-out 0.35s ease forwards" }
    : undefined;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-[320px] flex flex-col items-center gap-10">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{
              background: T.brand,
              animation: success
                ? "mr-login-lift 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) forwards"
                : undefined,
            }}
          >
            🦆
          </div>
          <div className="text-center" style={fadeOut}>
            <h1 className="text-2xl font-bold text-foreground">Mr Ducky</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Enter your PIN to continue</p>
          </div>
        </div>

        {/* PIN dots */}
        <div
          className="flex gap-4"
          style={{
            animation: shake
              ? "shake 0.5s ease"
              : success
                ? "mr-login-fade-out 0.3s ease forwards"
                : undefined,
          }}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border-2 transition-all duration-150"
              style={{
                background: i < pin.length ? T.brand : "transparent",
                borderColor: i < pin.length ? T.brand : T.border,
              }}
            />
          ))}
        </div>

        {/* Error */}
        <p
          className="text-sm -mt-6 h-4 transition-opacity"
          style={{
            color: T.danger,
            opacity: error ? 1 : 0,
          }}
        >
          {error ?? ""}
        </p>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full" style={fadeOut}>
          {KEYS.map((key, i) => {
            if (key === "") return <div key={`empty-${i}`} />;

            const isDel = key === "del";
            return (
              <button
                key={key}
                onClick={() => press(key)}
                disabled={loading || success}
                className="h-16 rounded-2xl flex items-center justify-center text-xl font-semibold text-foreground transition-opacity active:opacity-60 disabled:opacity-40"
                style={{ background: T.card }}
                aria-label={isDel ? "Delete" : key}
              >
                {isDel ? <Delete className="w-5 h-5" /> : key}
              </button>
            );
          })}
        </div>

      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
