'use client'
import Link from "next/link"
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

interface itemProps {
    href: string,
    children: React.ReactNode,
    isActive: boolean,
    overrideHref?: string,
}


export default function AdminNavbar() {
    const { t } = useLanguage();
    const pathname = usePathname();
    const basePath = "/dashboard/admin";
    const dashboardRoot = "/dashboard/admin";

    const checkActive = (path: string) => {
        if (!pathname) return false;
        return pathname.startsWith(`${basePath}/${path}`);
    };

    return (
        <div className="flex flex-col px-4 font-serif">
            <MenuItem basePath={basePath} href="" overrideHref={dashboardRoot} isActive={pathname === dashboardRoot}>{t('overview') || 'Overview'}</MenuItem>
            <MenuItem basePath={basePath} href="parties" isActive={checkActive("parties")}>{t('parties') || 'Parties'}</MenuItem>
            <MenuItem basePath={basePath} href="trinks" isActive={checkActive("trinks")}>{t('drinks_list') || 'Getränkeliste'}</MenuItem>
            <MenuItem basePath={basePath} href="influence" isActive={checkActive("influence")}>{t('influence') || 'Einflussnahme'}</MenuItem>
            <MenuItem basePath={basePath} href="events" isActive={checkActive("events")}>{t('nav_events') || 'Events'}</MenuItem>
            <MenuItem basePath={basePath} href="notifications" isActive={checkActive("notifications")}>{t('notifications') || 'Notifications'}</MenuItem>
            <MenuItem basePath={basePath} href="party-passwords" isActive={checkActive("party-passwords")}>{t('party_passwords') || 'Party Passwords'}</MenuItem>
            <MenuItem basePath={basePath} href="overview" overrideHref="/overview" isActive={pathname === "/overview"}>{t('beamer_overview') || 'Beamer-Overview'}</MenuItem>
            <MenuItem basePath={basePath} href="danger-zone" isActive={checkActive("danger-zone")}><span className="text-red-600">{t('danger_zone') || 'Danger Zone'}</span></MenuItem>
        </div>
    )
}

function MenuItem(
    { children, href, isActive, basePath, overrideHref }: itemProps & { basePath: string },
) {
    const target = overrideHref ?? (href ? `${basePath}/${href}` : `${basePath}`);
    return (
        <div className={`py-2 border-slate-200 border-b px-2 ${isActive ? 'bg-gray-800' : ''}`}>
            <Link className="text-xl" href={target}>
                {children}
            </Link>
        </div>
    )
}
