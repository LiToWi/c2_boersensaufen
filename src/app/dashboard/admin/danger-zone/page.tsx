"use client";

import { useState, useEffect } from "react";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Play, Square, RotateCcw, Clock, Activity, TestTube, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useLanguage, getBothLanguages } from "@/contexts/LanguageContext";

export default function DangerZone() {
  const { t } = useLanguage();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const startMarket = useAction(api.adminActions.startMarket);
  const stopMarket = useAction(api.adminActions.stopMarket);
  const resetSystem = useAction(api.adminActions.resetSystem);
  const sendNotification = useMutation(api.notifications.sendNotification);
  const systemStatus = useQuery(api.adminQueries.getSystemStatus);
  const testMode = useQuery(api.testMode.getTestMode);
  const toggleTestMode = useMutation(api.testMode.toggleTestMode);
  const [isEnding, setIsEnding] = useState(false);

  // Update current time every second for runtime display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate running time dynamically based on market state
  const getRunningTimeMs = () => {
    if (!systemStatus?.marketState) return 0;
    
    // If system is reset, always show 0
    if (systemStatus.status === 'reset') {
      return 0;
    }
    
    const totalTime = systemStatus.marketState.totalRunningTimeMs || 0;
    
    // If market is stopped, use only the accumulated total time
    if (systemStatus.status === 'stopped') {
      return totalTime;
    }
    
    // If market is running, add current session time to total
    if (systemStatus.status === 'running' && systemStatus.marketState.currentSessionStartedAt) {
      const currentSessionTime = currentTime - systemStatus.marketState.currentSessionStartedAt;
      return totalTime + currentSessionTime;
    }
    
    // Fallback
    return totalTime;
  };

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const result = await startMarket({});
      await sendNotification({
        title: getBothLanguages('msg_market_started'),
        message: getBothLanguages('msg_market_started_text'),
        severity: 'success',
      });
      toast.success(result.message || t('market_started') || 'Market started successfully');
    } catch (error: any) {
      toast.error(t('failed_start_market') || `Failed to start market: ${error.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    try {
      const result = await stopMarket({});
      await sendNotification({
        title: getBothLanguages('msg_market_stopped'),
        message: getBothLanguages('msg_market_stopped_text'),
        severity: 'warning',
      });
      toast.success(result.message || t('market_stopped') || 'Market stopped successfully');
    } catch (error: any) {
      toast.error(t('failed_stop_market') || `Failed to stop market: ${error.message}`);
    } finally {
      setIsStopping(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result = await resetSystem({});
      toast.success(result.message || t('system_reset') || 'System reset successfully');
      setShowResetConfirm(false);
    } catch (error: any) {
      toast.error(t('failed_reset_system') || `Failed to reset system: ${error.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleTestMode = async () => {
    try {
      const result = await toggleTestMode();
      toast.success(
        result.testMode
          ? t('test_mode_enabled_message') || 'Test Mode ENABLED - R2O calls will be skipped'
          : t('test_mode_disabled_message') || 'Test Mode DISABLED - R2O calls active'
      );
    } catch (error) {
      toast.error((t('failed_toggle_test_mode') || 'Failed to toggle test mode') + ': ' + String(error));
    }
  };

  const handleEnd = async () => {
    setIsEnding(true);
    try {
      await sendNotification({
        title: getBothLanguages('msg_event_ended'),
        message: getBothLanguages('msg_event_ended_text'),
        severity: 'danger',
      });
      toast.success(t('notification_sent') || 'End notification sent');
    } catch (error: any) {
      toast.error(error?.message || (t('notification_failed') || 'Failed to send end notification'));
    } finally {
      setIsEnding(false);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-yellow-500';
      case 'reset': return 'bg-gray-500';
      case 'partially_reset': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'running': return t('running') || 'Running';
      case 'stopped': return t('stopped') || 'Stopped';
      case 'reset': return t('reset') || 'Reset';
      case 'partially_reset': return t('partially_reset') || 'Partially Reset';
      default: return t('unknown') || 'Unknown';
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-8 w-8 text-red-600" />
        <h2 className="text-4xl font-bold text-red-600">{t('danger_zone') || 'Danger Zone'}</h2>
      </div>
      
      <p className="text-gray-400">
        {t('danger_zone_description') || 'These actions affect the entire system. Use with caution.'}
      </p>

      {/* Test Mode Control */}
      <Card className={`${testMode ? 'bg-yellow-900/40 border-yellow-500/60' : 'bg-slate-900/80 border-slate-500/40'}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              {t('test_mode') || 'Test Mode'}
            </span>
            <Badge variant={testMode ? "default" : "secondary"} className={testMode ? 'bg-yellow-600' : ''}>
              {testMode ? (t('enabled') || 'ENABLED') : (t('disabled') || 'DISABLED')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300 mb-2">
                {testMode
                  ? t('test_mode_desc_on') || 'Ready2Order API calls are SKIPPED. Use this to test the app without consequences.'
                  : t('test_mode_desc_off') || 'Ready2Order integration is ACTIVE. Orders and tables will be created in R2O.'}
              </p>
              {testMode && (
                <p className="text-xs text-yellow-400 font-semibold">
                  ⚠️ {t('test_mode_warning') || 'No orders will be sent to Ready2Order while test mode is enabled'}
                </p>
              )}
            </div>
            <Button
              onClick={handleToggleTestMode}
              variant={testMode ? "destructive" : "default"}
              size="lg"
              className="ml-4"
            >
              {testMode ? (t('disable') || 'Disable') : (t('enable') || 'Enable')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Status Card */}
      {systemStatus && (
        <Card className="bg-slate-900/80 border-blue-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('system_status') || 'System Status'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(systemStatus.status)}>
                {getStatusLabel(systemStatus.status)}
              </Badge>
              {systemStatus.marketState && (
                <Badge variant="outline">
                  {t('regime') || 'Regime'}: {systemStatus.marketState.regime}
                </Badge>
              )}
              <Badge className={testMode ? 'bg-yellow-600 text-black' : 'bg-slate-700'}>
                {t('test_mode') || 'Test Mode'}: {testMode ? (t('enabled') || 'ENABLED') : (t('disabled') || 'DISABLED')}
              </Badge>
            </div>

            {systemStatus.marketState && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">{t('running_time') || 'Running Time'}</p>
                  <p className="text-lg font-mono flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {formatDuration(getRunningTimeMs())}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">{t('tick_count') || 'Tick Count'}</p>
                  <p className="text-lg font-mono">
                    {systemStatus.marketState.tickCount.toLocaleString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-400">{t('last_tick') || 'Last Tick'}</p>
                  <p className="text-sm">
                    {new Date(systemStatus.marketState.lastTickAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {!systemStatus.hasData && systemStatus.status === 'reset' && (
              <p className="text-sm text-gray-400 italic">
                {t('system_clean_state') || 'System is in clean state - no parties or orders exist'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Start Market */}
      <Card className="bg-slate-900/80 border-green-500/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-400">
            <Play className="h-5 w-5" />
            {t('start_market') || 'Start Market'}
          </CardTitle>
          <CardDescription>
            {t('start_market_description') || 'Initialize the market and enable dynamic pricing calculations'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleStart}
            disabled={isStarting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isStarting ? (t('starting') || 'Starting...') : (t('start_market') || 'Start Market')}
          </Button>
        </CardContent>
      </Card>

      {/* Stop Market */}
      <Card className="bg-slate-900/80 border-yellow-500/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-400">
            <Square className="h-5 w-5" />
            {t('stop_market') || 'Stop Market'}
          </CardTitle>
          <CardDescription>
            {t('stop_market_description') || 'Pause all pricing calculations without deleting data'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleStop}
            disabled={isStopping}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isStopping ? (t('stopping') || 'Stopping...') : (t('stop_market') || 'Stop Market')}
          </Button>
        </CardContent>
      </Card>

      {/* End Event */}
      <Card className="bg-slate-900/80 border-red-500/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <LogOut className="h-5 w-5" />
            {t('end_event') || 'End Event'}
          </CardTitle>
          <CardDescription>
            {t('end_event_description') || 'Broadcast notification that the event has ended and no more orders are possible'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleEnd}
            disabled={isEnding}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
          >
            {isEnding ? (t('ending') || 'Ending...') : (t('end_event') || 'End Event')}
          </Button>
        </CardContent>
      </Card>

      {/* Reset System */}
      <Card className="bg-slate-900/80 border-red-500/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <RotateCcw className="h-5 w-5" />
            {t('reset_system') || 'Reset System'}
          </CardTitle>
          <CardDescription className="text-red-300">
            {t('reset_system_warning') || '⚠️ WARNING: This will delete ALL parties, orders, and related data. Drinks will be reset to default state. This action CANNOT be undone! Cleanup runs in background (30-60 seconds).'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showResetConfirm ? (
            <Button
              onClick={() => setShowResetConfirm(true)}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              {t('reset_system') || 'Reset System'}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-red-950/50 border border-red-500/50 rounded">
                <p className="font-bold text-red-400 mb-2">{t('reset_confirm_title') || 'Are you absolutely sure?'}</p>
                <p className="text-sm text-gray-300">
                  {t('reset_confirm_subtitle') || 'This will permanently delete:'}
                </p>
                <ul className="list-disc list-inside text-sm text-gray-300 mt-2 space-y-1">
                  <li>{t('reset_delete_parties') || 'All parties (open and closed)'}</li>
                  <li>{t('reset_delete_orders') || 'All orders and order items'}</li>
                  <li>{t('reset_delete_members') || 'All party members'}</li>
                  <li>{t('reset_delete_r2o') || 'All R2O orders and products'}</li>
                  <li>{t('reset_delete_snapshots') || 'All price snapshots and tick data'}</li>
                </ul>
                <p className="text-sm text-gray-300 mt-2">
                  {t('reset_confirm_result') || 'Market will be stopped and drinks reset to default prices.'}
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleReset}
                  disabled={isResetting}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isResetting ? (t('resetting') || 'Resetting...') : (t('confirm_reset') || 'Yes, Reset Everything')}
                </Button>
                <Button
                  onClick={() => setShowResetConfirm(false)}
                  variant="outline"
                >
                  {t('cancel') || 'Cancel'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}