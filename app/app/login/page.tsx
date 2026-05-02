"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Delete } from "lucide-react";

const PIN_LENGTH = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

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
      router.push("/");
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
    if (loading) return;
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-[320px] flex flex-col items-center gap-10">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: "var(--color-brand)" }}
          >
            🦆
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Mr Ducky</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Enter your PIN to continue</p>
          </div>
        </div>

        {/* PIN dots */}
        <div
          className="flex gap-4"
          style={{
            animation: shake ? "shake 0.5s ease" : undefined,
          }}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border-2 transition-all duration-150"
              style={{
                background: i < pin.length ? "var(--color-brand)" : "transparent",
                borderColor: i < pin.length ? "var(--color-brand)" : "oklch(0.4 0 0)",
              }}
            />
          ))}
        </div>

        {/* Error */}
        <p
          className="text-sm -mt-6 h-4 transition-opacity"
          style={{
            color: "oklch(0.704 0.191 22.216)",
            opacity: error ? 1 : 0,
          }}
        >
          {error ?? ""}
        </p>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {KEYS.map((key, i) => {
            if (key === "") return <div key={i} />;

            const isDel = key === "del";
            return (
              <button
                key={key}
                onClick={() => press(key)}
                disabled={loading}
                className="h-16 rounded-2xl flex items-center justify-center text-xl font-semibold text-foreground transition-opacity active:opacity-60 disabled:opacity-40"
                style={{ background: "var(--color-card)" }}
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
