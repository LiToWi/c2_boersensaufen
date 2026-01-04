'use client'
import Link from "next/link"
import { usePathname } from "next/navigation";
import { useState } from "react"

interface itemProps {
    href: string,
    children: React.ReactNode,
    isActive: boolean
}


export default function AdminNavbar() {
    const [active, setActive] = useState(false)

    const pathname = usePathname();

    const checkActive = (path: string) => {
        // Safe check: ensure pathname exists before checking includes
        return pathname ? pathname.includes(path) : false;
    };

    return (
        <div className="flex flex-col px-4 font-serif">
            <MenuItem href="parties" isActive={checkActive("parties")}>Parties</MenuItem>
            <MenuItem href="trinks" isActive={checkActive("trinks")}>Getränkeliste</MenuItem>
            <MenuItem href="house-is-winning" isActive={checkActive("house-is-winning")}>Das Haus gewinnt(?)</MenuItem>
            <MenuItem href="danger-zone" isActive={checkActive("danger-zone")}><span className="text-red-600">Danger Zone</span></MenuItem>
        </div>
    )
}

function MenuItem(
    { children, href, isActive }: itemProps,
) {
    return (
        <div className={`py-2 border-slate-200 border-b px-2 ${isActive ? 'bg-gray-800' : ''}`}>
            <Link className="text-xl" href={`${href}`}>
                {children}
            </Link>
        </div>
    )
}
