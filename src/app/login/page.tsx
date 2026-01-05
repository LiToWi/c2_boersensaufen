"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTokenLogin = async (token: string) => {
    const res = await signIn("credentials", {
      token,
      callbackUrl: "/",
      redirect: false,
    });
    if (!res?.ok) setError(t("invalid_login"));
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

  useEffect(() => {
    const token = searchParams.get("token");
    if (typeof token === "string") {
      handleTokenLogin(token);
    }
  }, [searchParams, router, t]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn("credentials", {
      name,
      password,
      callbackUrl: "/",
      redirect: false,
    });

    if (!res?.ok) setError(t("invalid_login"));
    else {
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
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded transition-transform duration-100 active:scale-95 hover:bg-blue-700"
            >
              {t("login")}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
