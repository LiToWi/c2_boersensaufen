"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Copy, Download, AlertCircle } from "lucide-react";

export default function PartyPasswordsPage() {
  const { t } = useLanguage();
  const [isInitializing, setIsInitializing] = useState(false);
  const [copied, setCopied] = useState(false);

  const initializePasswords = useMutation(api.partyPasswords.initializePartyPasswords);
  const availableCount = useQuery(api.partyPasswords.getAvailablePasswordCount);
  const allPasswords = useQuery(api.partyPasswords.getAllPasswords);
  const unusedPasswords = useQuery(api.partyPasswords.getAllUnusedPasswords);

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      const result = await initializePasswords();
      alert(result.message || "Passwords initialized successfully");
    } catch (error: any) {
      alert(error.message || "Failed to initialize passwords");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCopyPasswords = () => {
    if (unusedPasswords) {
      const text = unusedPasswords.join("\n");
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPasswords = () => {
    if (unusedPasswords) {
      const text = unusedPasswords.join("\n");
      const element = document.createElement("a");
      element.setAttribute(
        "href",
        "data:text/plain;charset=utf-8," + encodeURIComponent(text)
      );
      element.setAttribute("download", "party-passwords.txt");
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const usedCount = allPasswords ? allPasswords.filter((p: any) => p.used).length : 0;
  const totalCount = allPasswords ? allPasswords.length : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="bg-gray-900/70 border-gray-400">
        <CardHeader>
          <CardTitle>{t('party_passwords') || 'Party Codes'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gray-800">
              <CardContent className="pt-6">
                <p className="text-sm text-gray-400">{t('party_passwords_total') || 'Total Codes'}</p>
                <p className="text-3xl font-bold">{totalCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800">
              <CardContent className="pt-6">
                <p className="text-sm text-gray-400">{t('party_passwords_available') || 'Available'}</p>
                <p className="text-3xl font-bold text-green-500">{availableCount || 0}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800">
              <CardContent className="pt-6">
                <p className="text-sm text-gray-400">{t('party_passwords_used') || 'Used'}</p>
                <p className="text-3xl font-bold text-orange-500">{usedCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Initialize Button */}
          {totalCount === 0 ? (
            <div className="p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-grow">
                <h3 className="font-semibold text-yellow-600">{t('party_passwords_init_missing_title') || 'No codes initialized'}</h3>
                <p className="text-sm text-yellow-600/80 mt-1">
                  {t('party_passwords_init_missing_body') || 'Click to generate 100 random 8-digit party codes.'}
                </p>
              </div>
              <Button
                onClick={handleInitialize}
                disabled={isInitializing}
                className="bg-yellow-600 hover:bg-yellow-700 flex-shrink-0"
              >
                {isInitializing ? (t('party_passwords_init_pending') || 'Initializing...') : (t('party_passwords_init_btn') || 'Initialize Codes')}
              </Button>
            </div>
          ) : null}

          {/* Export Section */}
          {totalCount > 0 && unusedPasswords && unusedPasswords.length > 0 ? (
            <div className="p-4 bg-blue-900/20 border border-blue-600 rounded-lg space-y-3">
              <h3 className="font-semibold text-blue-400">{t('party_passwords_export_title') || 'Export Unused Codes'}</h3>
              <p className="text-sm text-blue-400/80">
                {unusedPasswords.length} {t('party_passwords_export_subtitle') || 'unused codes available for printing or distribution.'}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleCopyPasswords}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? (t('party_passwords_copy_done') || 'Copied!') : (t('party_passwords_copy_all') || 'Copy All')}
                </Button>
                <Button
                  onClick={handleDownloadPasswords}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('party_passwords_download') || 'Download as TXT'}
                </Button>
              </div>
            </div>
          ) : null}

          {/* Passwords List */}
          {totalCount > 0 && allPasswords ? (
            <div className="space-y-2">
              <h3 className="font-semibold">{t('party_passwords_list_title') || 'All Codes'}</h3>
              <div className="bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {allPasswords.map((password: any) => (
                    <div key={password.code} className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-gray-900 px-2 py-1 rounded">
                        {password.code}
                      </code>
                      <Badge
                        variant={password.used ? "secondary" : "outline"}
                        className={password.used ? "bg-orange-600" : "bg-green-600"}
                      >
                        {password.used ? (t('party_passwords_used_label') || 'Used') : (t('party_passwords_available_label') || 'Available')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
