"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useSession } from "next-auth/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const STORAGE_KEY = "notification_last_seen";
const EVENT_STORAGE_KEY = "event_last_seen";
const NOTIFICATION_WINDOW_MS = 30 * 1000; // 30 seconds - only show notifications created within this window

type Severity = "info" | "success" | "warning" | "danger";

export default function NotificationListener() {
  const { t, lang } = useLanguage();
  const { data: session, status } = useSession();
  const notifications = useQuery(api.notifications.getRecentNotifications, { limit: 10 });
  const currentEvent = useQuery(api.events.getCurrentEvent);
  const latestSeenRef = useRef<number>(0);
  const lastEventIdRef = useRef<string>("");

  useEffect(() => {
    // Wait for session to load before processing notifications
    if (status === 'loading') return;
    
    const normalizedUser = (session?.user?.name || '').trim().toLowerCase();
    if (normalizedUser === 'admin') return; // admins should not see broadcasts

    if (typeof window === 'undefined' || !notifications) return;

    const stored = Number(localStorage.getItem(STORAGE_KEY) || 0);
    latestSeenRef.current = stored;

    const now = Date.now();
    // Only show notifications that are:
    // 1. Newer than what we've already seen
    // 2. Created within the last 30 seconds (broadcast and forget window)
    const unseen = notifications.filter((n: any) => 
      n.createdAt > stored && 
      (now - n.createdAt) < NOTIFICATION_WINDOW_MS
    );
    if (unseen.length === 0) return;

    // Show oldest first for readable order
    unseen
      .sort((a: any, b: any) => a.createdAt - b.createdAt)
      .forEach((n: any) => {
        // Handle both legacy string format and new bilingual object format
        const titleText = n.title 
          ? (typeof n.title === 'string' ? n.title : (n.title[lang] || n.title.en || n.title.de))
          : (t('notifications') || 'Notification');
        const bodyText = typeof n.message === 'string' 
          ? n.message 
          : (n.message[lang] || n.message.en || n.message.de);
        
        const severity = (n.severity || 'info') as Severity;
        const dismissLabel = t('dismiss') || 'Dismiss';

        const show =
          severity === 'success' ? toast.success :
          severity === 'warning' ? toast.warning :
          severity === 'danger' ? toast.error :
          toast.info;

        let toastId: string | number | undefined;
        toastId = show(titleText, {
          description: bodyText,
          duration: Infinity, // persist until dismissed
          action: {
            label: dismissLabel,
            onClick: () => {
              if (toastId !== undefined) toast.dismiss(toastId);
            },
          },
        });

        latestSeenRef.current = Math.max(latestSeenRef.current, n.createdAt);
      });

    localStorage.setItem(STORAGE_KEY, String(latestSeenRef.current));
  }, [notifications, t, lang, session, status]);

  // Handle event notifications
  useEffect(() => {
    if (status === 'loading') return;
    
    const normalizedUser = (session?.user?.name || '').trim().toLowerCase();
    if (normalizedUser === 'admin') return; // admins should not see event toasts

    if (currentEvent === undefined) return;

    const lastEventId = localStorage.getItem(EVENT_STORAGE_KEY) || "";
    
    // Only notify if event changed
    if (currentEvent && currentEvent._id !== lastEventId) {
      const eventText = lang === 'de' ? currentEvent.textDe : currentEvent.textEn;
      toast.info("🔥 " + t('current_event') || 'Event', {
        description: eventText,
        duration: 5000,
      });
      localStorage.setItem(EVENT_STORAGE_KEY, currentEvent._id);
      lastEventIdRef.current = currentEvent._id;
    }
  }, [currentEvent, lang, session, status, t]);

  return null;
}

