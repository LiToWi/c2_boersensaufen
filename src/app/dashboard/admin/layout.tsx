"use client";

import AdminNavbar from "@/components/admin/AdminNavbar";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Layout({ children, }:
    { children: React.ReactNode }
) {
    const { t } = useLanguage();
    
    return (
        <div className="bg-gray-900 my-4 py-4 rounded-none md:rounded-xl min-h-screen ">
            <h1 className="text-3xl text-center font-serif">{t('admin_dashboard') || 'Admin Dashboard'}</h1>
                <div className="grid grid-cols-4 pt-2">
                    <AdminNavbar />
                    <div className="col-span-3 pr-3">{children}</div>
                </div>
        </div>
    )
}
