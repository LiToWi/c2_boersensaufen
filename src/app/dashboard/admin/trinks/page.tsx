"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export default function Trinks() {
    const { t } = useLanguage();
    
    return (
        <h1>{t('drinks_list') || 'Getränkeliste'}</h1>
    )
}