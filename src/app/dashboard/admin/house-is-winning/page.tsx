"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export default function HouseIsWinning() {
    const { t } = useLanguage();

    return (
        <h1 className="text-6xl">{t('house_is_winning') || 'The House is fucking Winning!!!!'}</h1>
    )
}