"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showMarketInactiveModal, setShowMarketInactiveModal] = useState(false);
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const marketState = useQuery(api.pricingTick.getMarketState);
  const loading = marketState === undefined;
  const marketActive = marketState ? marketState.active !== false : false;
  const normalizedName = name.trim().toLowerCase();
  const isPrivilegedInput = ["admin", "tester", "bar"].includes(normalizedName);
  const isBlocked = !isPrivilegedInput && !marketActive;
  
  useEffect(() => {
    if (error) setError("");
  }, [name, password]);

  // Handle token-based auto-login from URL parameter
  useEffect(() => {
    const token = searchParams.get("token");
    if (typeof token === "string") {
      handleTokenLogin(token);
    }
  }, [searchParams]);

  const handleTokenLogin = async (token: string) => {
    const res = await signIn("token", {
      token,
      callbackUrl: "/",
      redirect: false,
    });
    if (!res?.ok) setError(res?.error === "MARKET_INACTIVE" ? t("market_not_started") : t("invalid_login"));
    else {
      // Get table name from session after login
      const response = await fetch("/api/auth/session");
      const session = await response.json();
      if (session?.user?.name) {
        window.location.href = `/tables/${session.user.name}`;
      } else {
        window.location.href = "/";
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show modal for non-admin users when market is inactive
    if (isBlocked) {
      setShowMarketInactiveModal(true);
      return;
    }
    
    setError(""); // Clear previous errors
    const res = await signIn("credentials", {
      name,
      password,
      callbackUrl: "/",
      redirect: false,
    });

    if (!res?.ok) {
      // Check for market inactive error from server
      if (res?.error?.includes("MARKET_INACTIVE")) {
        setError(t("market_not_started"));
      } else {
        setError(res?.error || t("invalid_login"));
      }
    } else {
      // Redirect to table page after successful login
      window.location.href = `/tables/${name}`;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md bg-slate-900/80 border border-blue-500/40 text-white shadow-lg backdrop-blur">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">{t("login")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              placeholder={t("table_name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full p-3 rounded border border-blue-500/40 bg-slate-800 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
            <input
              placeholder={t("password")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full p-3 rounded border border-blue-500/40 bg-slate-800 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type={isBlocked ? "button" : "submit"}
              onClick={isBlocked ? () => setShowMarketInactiveModal(true) : undefined}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded transition-transform duration-100 active:scale-95 hover:bg-blue-700 disabled:opacity-50"
            >
              {t("login")}
            </button>
            {!isBlocked && error && <p className="text-sm text-red-400">{error}</p>}
          </form>
        </CardContent>
      </Card>

      {/* Market Inactive Modal */}
      {showMarketInactiveModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-slate-900 border border-yellow-500/40 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-center text-xl font-semibold text-yellow-400">⏱️ {t("market_not_started")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-200 text-center">
                {t("market_not_started")}
              </p>
              <button
                onClick={() => setShowMarketInactiveModal(false)}
                className="w-full py-2 bg-blue-600 text-white rounded transition-transform duration-100 active:scale-95 hover:bg-blue-700"
              >
                {t("accept")}
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
