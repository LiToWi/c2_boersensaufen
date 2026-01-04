"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRouter, useSearchParams } from "next/navigation";

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
      callbackUrl: "/dashboard/user",
      redirect: false,
    });
    if (!res?.ok) setError(t("invalid_login"));
    else window.location.href = "/dashboard/user";
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
      callbackUrl: "/dashboard/user",
      redirect: false,
    });

    if (!res?.ok) setError(t("invalid_login"));
    else window.location.href = "/dashboard/user";
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleLogin} className="w-full max-w-md">
        <input
          placeholder={t("table_name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block w-full mb-4 p-2 border rounded"
        />
        <input
          placeholder={t("password")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full mb-4 p-2 border rounded"
        />
        <button
          type="submit"
          className="w-full py-2 bg-blue-600 text-white rounded transition-transform duration-100 active:scale-95"
        >
          {t("login")}
        </button>
        {error && <p className="mt-2 text-red-600">{error}</p>}
      </form>
    </div>
  );
}
