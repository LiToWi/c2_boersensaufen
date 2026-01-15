"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminNavbar from "@/components/admin/AdminNavbar";
import LoadingAnimation from "@/components/LoadingAnimation";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Layout({ children, }:
    { children: React.ReactNode }
) {
    const { t } = useLanguage();
    const { data: session, status } = useSession();
    const router = useRouter();

    // Access control: only admin account
    useEffect(() => {
        if (status === "loading") return;

        if (!session) {
            router.push("/login");
            return;
        }

        const userRole = session.user?.name?.toLowerCase() || "";
        const isAdmin = userRole === "admin";

        if (!isAdmin) {
            // Redirect non-admin users to their appropriate dashboard
            router.push("/dashboard/user");
        }
    }, [session, status, router]);

    // Show loading while checking access
    if (status === "loading" || !session) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingAnimation />
            </div>
        );
    }

    const userRole = session.user?.name?.toLowerCase() || "";
    const isAdmin = userRole === "admin";

    // Don't render anything if user is not admin
    if (!isAdmin) {
        return null;
    }
    
        return (
            <div className="bg-gray-900 my-4 py-4 rounded-none md:rounded-xl min-h-screen ">
                <h1 className="text-3xl text-center font-serif">{t('admin_dashboard') || 'Admin Dashboard'}</h1>
                    <div className="grid grid-cols-4 pt-2">
                        <AdminNavbar />
                        <div className="col-span-3 pr-3">{children}</div>
                    </div>
            </div>
        );
    }
