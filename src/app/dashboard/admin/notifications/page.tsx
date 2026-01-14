"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage, getBothLanguages } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const severityOptions = [
  { value: "info", labelKey: "info" },
  { value: "success", labelKey: "success" },
  { value: "warning", labelKey: "warning" },
  { value: "danger", labelKey: "danger" },
];

const presetCategories = [
  {
    category: 'category_market',
    presets: [
      {
        label: 'msg_market_stopped',
        title: 'msg_market_stopped',
        message: 'msg_market_stopped_text',
        severity: 'warning',
      },
      {
        label: 'msg_event_ended',
        title: 'msg_event_ended',
        message: 'msg_event_ended_text',
        severity: 'danger',
      },
    ],
  },
  {
    category: 'category_safety',
    presets: [
      {
        label: 'msg_safety_first',
        title: 'msg_safety_first',
        message: 'msg_safety_first_text',
        severity: 'info',
      },
      {
        label: 'msg_drink_water',
        title: 'msg_drink_water',
        message: 'msg_drink_water_text',
        severity: 'info',
      },
    ],
  },
  {
    category: 'category_bar',
    presets: [
      {
        label: 'msg_long_queue',
        title: 'msg_long_queue',
        message: 'msg_long_queue_text',
        severity: 'warning',
      },
    ],
  },
  {
    category: 'category_kitchen',
    presets: [
      {
        label: 'msg_kitchen_open',
        title: 'msg_kitchen_open',
        message: 'msg_kitchen_open_text',
        severity: 'success',
      },
      {
        label: 'msg_kitchen_closed',
        title: 'msg_kitchen_closed',
        message: 'msg_kitchen_closed_text',
        severity: 'danger',
      },
      {
        label: 'msg_kitchen_closing_30',
        title: 'msg_kitchen_closing_30',
        message: 'msg_kitchen_closing_30_text',
        severity: 'warning',
      },
      {
        label: 'msg_kitchen_closing_15',
        title: 'msg_kitchen_closing_15',
        message: 'msg_kitchen_closing_15_text',
        severity: 'warning',
      },
    ],
  },
];

export default function NotificationsPage() {
  const { t } = useLanguage();
  const sendNotification = useMutation(api.notifications.sendNotification);
  const [titleDe, setTitleDe] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [messageDe, setMessageDe] = useState("");
  const [messageEn, setMessageEn] = useState("");
  const [severity, setSeverity] = useState("info");
  const [isSending, setIsSending] = useState(false);

  const sendPreset = async (preset: (typeof presetCategories[0]['presets'])[0]) => {
    try {
      setIsSending(true);
      await sendNotification({
        title: getBothLanguages(preset.title),
        message: getBothLanguages(preset.message),
        severity: preset.severity,
      });
      toast.success(t('notification_sent') || 'Notification sent');
    } catch (err: any) {
      console.error('[Admin] Failed to send preset notification', err);
      toast.error(err?.message || t('notification_failed') || 'Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageDe.trim() || !messageEn.trim()) {
      toast.error(t('message_required') || 'Both language versions are required');
      return;
    }

    try {
      setIsSending(true);
      await sendNotification({
        message: { de: messageDe.trim(), en: messageEn.trim() },
        title: (titleDe.trim() || titleEn.trim()) ? { de: titleDe.trim() || messageDe.trim(), en: titleEn.trim() || messageEn.trim() } : undefined,
        severity,
      });
      toast.success(t('notification_sent') || 'Notification sent');
      setMessageDe("");
      setMessageEn("");
      setTitleDe("");
      setTitleEn("");
    } catch (err: any) {
      console.error('[Admin] Failed to send notification', err);
      toast.error(err?.message || t('notification_failed') || 'Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="bg-slate-900/80 border-blue-500/40">
      <CardHeader>
        <CardTitle>{t('notifications') || 'Notifications'}</CardTitle>
        <p className="text-sm text-gray-400">{t('notification_broadcast_hint') || 'Send a toast to every connected user instantly.'}</p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-gray-300" htmlFor="title-de">{t('title') || 'Title'} (DE)</label>
            <Input
              id="title-de"
              value={titleDe}
              onChange={(e) => setTitleDe(e.target.value)}
              placeholder={t('optional') || 'Optional'}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300" htmlFor="title-en">{t('title') || 'Title'} (EN)</label>
            <Input
              id="title-en"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder={t('optional') || 'Optional'}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300" htmlFor="message-de">{t('message') || 'Message'} (DE)</label>
            <textarea
              id="message-de"
              value={messageDe}
              onChange={(e) => setMessageDe(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-gray-700 p-2 text-sm text-gray-100"
              rows={4}
              placeholder="Deutsche Nachricht..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300" htmlFor="message-en">{t('message') || 'Message'} (EN)</label>
            <textarea
              id="message-en"
              value={messageEn}
              onChange={(e) => setMessageEn(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-gray-700 p-2 text-sm text-gray-100"
              rows={4}
              placeholder="English message..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300" htmlFor="severity">{t('severity') || 'Severity'}</label>
            <select
              id="severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-gray-700 p-2 text-sm text-gray-100"
            >
              {severityOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900">
                  {t(opt.labelKey) || opt.value}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSending}>
              {isSending ? (t('sending') || 'Sending...') : (t('send') || 'Send')}
            </Button>
          </div>
        </form>

        {/* Quick-action presets grouped by category */}
        <div className="mt-8 pt-6 border-t border-gray-700 space-y-6">
          <p className="text-sm font-semibold text-gray-300">{t('quick_messages') || 'Quick Messages'}</p>
          {presetCategories.map((group) => (
            <div key={group.category} className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t(group.category) || group.category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.presets.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    onClick={() => sendPreset(preset)}
                    disabled={isSending}
                    variant="outline"
                    className="text-xs justify-start"
                  >
                    {t(preset.label) || preset.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
