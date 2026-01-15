"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingAnimation from "@/components/LoadingAnimation";
import { Copy, AlertCircle } from "lucide-react";

export default function BarPasswordDistributionPage() {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isGivingOut, setIsGivingOut] = useState(false);

  // Access control: only admin and bar can access this page
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    const userRole = session.user?.name?.toLowerCase() || "";
    const isBar = userRole === "bar";
    const isAdmin = userRole === "admin";

    if (!isBar && !isAdmin) {
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
  const isBar = userRole === "bar";
  const isAdmin = userRole === "admin";

  // Don't render anything if user doesn't have access
  if (!isBar && !isAdmin) {
    return null;
  }

  const nextPassword = useQuery(api.partyPasswords.getNextAvailablePassword);
  const markAsGivenOut = useMutation(api.partyPasswords.markPasswordAsGivenOut);

  const handleCopyCode = () => {
    if (nextPassword?.code) {
      navigator.clipboard.writeText(nextPassword.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGaveOutCode = async () => {
    if (!nextPassword?.passwordId) return;

    setIsGivingOut(true);
    try {
      await markAsGivenOut({ passwordId: nextPassword.passwordId });
      // Component will automatically refetch due to Convex reactivity
    } catch (error: any) {
      alert(error.message || "Failed to mark password as given out");
    } finally {
      setIsGivingOut(false);
    }
  };

  if (!nextPassword) {
    return (
      <div className="container mx-auto p-6">
        <Card className="bg-gray-900/70 border-gray-400">
          <CardContent className="pt-6">
            <div className="p-4 bg-red-900/20 border border-red-600 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-600">{t('bar_codes_no_passwords_title') || 'No Passwords Available'}</h3>
                <p className="text-sm text-red-600/80 mt-1">
                  {t('bar_codes_no_passwords_body') || 'All party creation passwords have been distributed. Please contact admin if you need more.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-600 border-2">
        <CardHeader>
          <CardTitle className="text-2xl">{t('bar_codes_title') || 'Next Party Code'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Password Display */}
          <div className="space-y-3">
            <p className="text-sm text-gray-400">{t('bar_codes_subtext') || 'Give this code to a student in exchange for their ID:'}</p>
            <div className="flex items-center gap-3">
              <div className="bg-gray-800 px-6 py-4 rounded-lg border-2 border-blue-600">
                <code className="text-4xl font-bold font-mono text-blue-400 tracking-widest">
                  {nextPassword.code}
                </code>
              </div>
              <Button
                onClick={handleCopyCode}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? (t('bar_codes_copied') || 'Copied!') : (t('bar_codes_copy') || 'Copy')}
              </Button>
            </div>
          </div>

          {/* Remaining Count */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <span className="text-gray-300">{t('bar_codes_remaining') || 'Passwords remaining'}:</span>
            <Badge className="bg-blue-600 text-white px-3 py-1">
              {nextPassword.remaining - 1} / 100
            </Badge>
          </div>

          {/* Main Action Button */}
          <Button
            onClick={handleGaveOutCode}
            disabled={isGivingOut}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
          >
            {isGivingOut ? (t('bar_codes_giveout_pending') || 'Marking as given out...') : (t('bar_codes_giveout_btn') || '✓ Gave out this code')}
          </Button>

          {/* Instructions */}
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 text-sm text-gray-300 space-y-2">
            <p className="font-semibold">{t('bar_codes_how_title') || 'How it works:'}</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>{t('bar_codes_step1') || 'Student shows their ID'}</li>
              <li>{t('bar_codes_step2') || 'You give them the code above'}</li>
              <li>{t('bar_codes_step3') || 'Click "Gave out this code"'}</li>
              <li>{t('bar_codes_step4') || 'Next code appears automatically'}</li>
              <li>{t('bar_codes_step5') || 'Student creates a party using the code'}</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
