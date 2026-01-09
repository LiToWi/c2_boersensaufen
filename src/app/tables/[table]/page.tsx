"use client"

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useParty } from "@/contexts/PartyContext"; // Add this import
import { useLanguage } from '@/contexts/LanguageContext'

export default function TablePage() {
  const { t } = useLanguage()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [partyName, setPartyName] = useState('')
  const [partyPassword, setPartyPassword] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  
  // Add party context
  const { currentTable, currentParty, partyName: currentPartyName, setCurrentParty, clearCurrentParty } = useParty()

  // member tracking
  const [memberKey, setMemberKey] = useState<string | null>(null);
  const createMember = useMutation(api.partyMembers.createMember);
  const leaveMember = useMutation(api.partyMembers.leaveMember);
  const createParty = useMutation(api.parties.createParty);
  const updateR2OTableId = useMutation(api.parties.updatePartyR2OTableId);
  
  // Monitor current party status to detect if it's been closed/deleted
  const currentPartyStatus = useQuery(
    api.parties.getPartyById,
    currentParty && currentParty !== "" ? { id: currentParty as any } : "skip"
  );
  
  const getPartyOrderSummary = useQuery(
    api.drinks.getPartyOrderSummary,
    currentParty && currentParty !== "" ? { partyId: currentParty as any } : "skip"
  );
  const allPartyOrders = useQuery(
    api.drinks.getPartyOrders,
    currentParty && currentParty !== "" ? { partyId: currentParty as any } : "skip"
  );

  useEffect(() => {
      if (status === 'loading') return
      if (!session) router.push('/')
  }, [session, status, router])

  // ensure we have a persistent member key for this browser
  useEffect(() => {
    try {
      let mk = localStorage.getItem('partyMemberKey');
      if (!mk) {
        // prefer crypto.randomUUID if available
        // fallback to timestamp+random
        // eslint-disable-next-line no-undef
        const generated = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('partyMemberKey', generated);
        mk = generated;
      }
      setMemberKey(mk);
    } catch (err) {
      // ignore localStorage errors
    }
  }, []);

  const params = useParams();
  const tableName = params?.table as string | undefined;

  const table = useQuery(api.tables.getTableByName, tableName ? { name: tableName } : "skip");
  const parties = useQuery(api.parties.getOpenPartiesByName, tableName ? { name: tableName } : "skip");

  const loading = !table || !parties;

  // Mutations for creating and closing parties
  const validatePartyPassword = useMutation(api.parties.validatePartyPassword);
  const closeParty = useMutation(api.parties.closeParty);

  // Auto-rejoin party on mount if already a member
  useEffect(() => {
    if (!memberKey || !currentParty || !tableName) return;
    
    // If currentTable is set, only rejoin if it matches tableName
    // If currentTable is not set yet, it might be loading - so proceed with rejoin
    if (currentTable && currentTable !== tableName) return;

    const autoRejoin = async () => {
      try {
        await createMember({ partyId: currentParty as any, memberKey });
        console.log('Auto-rejoin successful for party:', currentParty);
      } catch (err) {
        console.error('Auto-rejoin failed:', err);
      }
    };

    autoRejoin();
  }, [memberKey, currentParty, currentTable, tableName, createMember]);

  // Monitor if current party is closed/deleted and kick user out
  useEffect(() => {
    if (!currentParty || !memberKey) return;
    
    // Skip if party status is still loading (undefined)
    if (currentPartyStatus === undefined) return;
    
    // If party no longer exists (null) or has been closed
    if (currentPartyStatus === null || currentPartyStatus?.closed) {
      console.log('Current party is closed or deleted, kicking user out');
      
      // Clear party context immediately
      clearCurrentParty();
      
      // Try to leave member on backend (fire and forget - party might already be deleted)
      if (memberKey && currentParty) {
        leaveMember({ partyId: currentParty as any, memberKey }).catch((err) => {
          console.log('Leave member failed (party might be deleted):', err);
        });
      }
    }
  }, [currentPartyStatus, currentParty, memberKey, leaveMember, clearCurrentParty]);

  async function handleCreateParty(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!partyName.trim() || !table?._id) return;

    if (!memberKey) {
      alert(t('creator_required') || 'Unable to create party: missing creator id.');
      return;
    }

    const activeCurrentParty = parties?.find((p: any) => p._id === currentParty && !p.closed);
    if (activeCurrentParty) {
      alert(t('create_party_limit') || 'You can only have one active party at a time.');
      return;
    }
    
    setIsCreating(true);
    try {
      const newParty = await createParty({ name: partyName, tableId: table._id, password: partyPassword, creatorId: memberKey });
      console.log('createParty returned', newParty);
      if (!newParty || !newParty._id) {
        alert(t('create_party_failed') || 'Failed to create party')
        return;
      }

      setPartyName('');
      setPartyPassword('');
      
      // Trigger R2O table creation via API route (has access to env vars)
      // Wait for it to complete and update party BEFORE joining
      try {
        console.log('[R2O] About to call create-table API...');
        const res = await fetch('/api/ready2order/create-table', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partyName: newParty.name, tableId: table._id }),
        });
        console.log('[R2O] create-table API returned, status:', res.status);
        
        const result = await res.json();
        console.log('[R2O] API response:', { ok: res.ok, success: result.success, tableId: result.r2oTableId });
        if (res.ok && result.success) {
          console.log('[R2O] Table created with ID:', result.r2oTableId);
          console.log('[R2O] Party ID to update:', newParty._id);
          console.log('[R2O] updateR2OTableId function available:', typeof updateR2OTableId);
          
          // Update party with R2O table ID - wait for completion
          try {
            console.log('[R2O] Calling updateR2OTableId mutation...');
            const updateResult = await updateR2OTableId({
              partyId: newParty._id as Id<'parties'>,
              r2oTableId: result.r2oTableId,
            });
            console.log('[R2O] Mutation completed successfully:', updateResult);
          } catch (mutationError) {
            console.error('[R2O] Mutation failed:', mutationError);
            // Don't block party creation if R2O update fails, but log it
            alert(t('r2o_setup_warning') || 'Warning: R2O table setup encountered an issue. Payment processing may not work.');
          }
        } else {
          console.error('[R2O] API returned error or not successful:', result);
          alert(t('r2o_creation_failed') || 'Warning: R2O table creation failed. You can still order but payment setup will not work.');
        }
      } catch (error) {
        console.error('[R2O] Network error or other error:', error);
        alert(t('r2o_network_error') || 'Warning: Could not connect to R2O. Payment processing may not work.');
      }
      
      // Automatically join the newly created party
      if (tableName && newParty) {
        // register member on server then set current party locally
        try {
          if (memberKey) {
            await createMember({ partyId: newParty._id, memberKey });
          }
        } catch (err) {
          console.error('createMember failed', err);
        }
        setCurrentParty(tableName, newParty._id, newParty.name);
      }
    } catch (error) {
      console.error('Error creating party:', error);
      const errorMsg = (error as any)?.message || '';
      
      // Check if it's the "party already exists" error
      if (errorMsg.includes('active party already exists')) {
        alert(t('party_already_exists') || 'An active party already exists at this table. Please close it first or choose a different name.');
      } else {
        alert(t('create_party_failed') || 'Failed to create party');
      }
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCloseParty(partyId: string) {
    if (!memberKey) {
      alert(t('creator_required') || 'Unable to close party: missing creator id.');
      return;
    }

    try {
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      await closeParty({ partyId: partyId as any, creatorId: memberKey });
      
      // If the current party is being closed, clear it
      if (currentParty === partyId) {
        try {
          if (memberKey) await leaveMember({ partyId: partyId as any, memberKey });
        } catch (err) {
          console.error('leaveMember failed during closeParty', err);
        }
        clearCurrentParty();
      }
    } catch (error: any) {
      console.error('Error closing party:', error);
      const errorMsg = error?.message || '';
      
      // Map backend errors to localized messages
      let localizedError: string;
      if (errorMsg.includes('finalized orders')) {
        localizedError = t('cannot_close_with_finalized') || 'Cannot close party with finalized orders. All payments must be settled at the register before closing.';
      } else if (errorMsg.includes('pending orders')) {
        localizedError = t('cannot_leave_with_orders') || 'There are pending orders in this party. Please complete or clear all orders first.';
      } else if (errorMsg.includes('creator')) {
        localizedError = t('only_creator_can_close') || 'Only the party creator can close this party.';
      } else {
        localizedError = t('error_closing_party') || 'Failed to close party. Please try again.';
      }
      
      alert(localizedError);
    }
  }

  // Add join party function
  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
  async function handleJoinParty(party: any) {
    if (!tableName) return;

    // If the party is password-protected, prompt for password and validate
    if (party?.hasPassword) {
      const pw = window.prompt(t('enter_party_password'))
      if (pw === null) return // cancelled
      const ok = await validatePartyPassword({ partyId: party._id, password: pw })
      if (!ok) {
        alert(t('incorrect_password'))
        return
      }
    }

    // If user is already in a different party, leave it first
    if (currentParty && currentParty !== party._id && memberKey) {
      try {
        await leaveMember({ partyId: currentParty as any, memberKey });
        console.log('Left previous party:', currentParty);
      } catch (err) {
        console.error('Failed to leave previous party:', err);
      }
    }

    if (tableName) {
      try {
        if (memberKey) {
          await createMember({ partyId: party._id, memberKey });
        }
      } catch (err) {
        console.error('createMember failed', err);
      }
      setCurrentParty(tableName, party._id, party.name);
    }
  }

  // leave currently joined party (unregister on server then clear local state)
  async function handleLeaveCurrentParty() {
    if (!currentParty) return;
    
    // Wait for orders to load before allowing leave
    if (allPartyOrders === undefined) {
      alert(t('loading') || 'Loading...');
      return;
    }
    
    // If there are orders, check if user is creator or last member
    if (allPartyOrders.length > 0) {
      const party = parties?.find((p: any) => p._id === currentParty);
      const memberCount = memberCounts?.find((c: any) => c.partyId === currentParty)?.count ?? 0;
      const isCreator = party && party.creatorId === memberKey;
      const isLastMember = memberCount <= 1;
      
      // Block leaving if you are the creator OR the last member
      if (isCreator || isLastMember) {
        if (isCreator && isLastMember) {
          alert(
            t('creator_cannot_leave_last') ||
            'As the party creator and last member, you must close the party and settle all payments before leaving.'
          );
        } else if (isCreator) {
          alert(
            t('creator_cannot_leave') ||
            'As the party creator, you cannot leave while there are orders. Please close the party or transfer ownership first.'
          );
        } else {
          alert(
            t('last_member_cannot_leave') ||
            'As the last member, you cannot leave while there are orders. Please close the party first.'
          );
        }
        return;
      }
      // Non-creators with other members can leave even with orders
    }
    
    try {
      if (memberKey) {
        await leaveMember({ partyId: currentParty as any, memberKey });
      }
    } catch (err) {
      console.error('leaveMember failed', err);
    }
    clearCurrentParty();
  }

  // member counts for displayed parties
  const partyIdsArg = parties && parties.length ? { partyIds: parties.map((p: any) => p._id) } : "skip";
  const memberCounts = useQuery(api.partyMembers.countMembersForParties, partyIdsArg as any);
  
  if (loading) return null;

  if (status === 'loading') return null;
  if (!session) return null;

  if (!tableName) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">{t('session_not_found')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (table === undefined || parties === undefined) {
    return <TableSkeleton />;
  }

  if (!table) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">{t('table_not_found')}</p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => router.back()}>{t('go_back')}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center p-4">
        {currentParty ? (
          <div className="mt-6 p-4 bg-gray-900/70 rounded-lg center flex flex-col items-center">
        <p className="text-white">
          {t('currently_joined')} <strong>{currentPartyName}</strong> {t('table_label')} <strong>{currentTable}</strong>
        </p>
        <button 
          onClick={handleLeaveCurrentParty}
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 mx-auto"
        >
          {t('leave_party')}
        </button>
          </div>
        ) : (
          <div className="mt-6 p-4 bg-gray-900/70 rounded-lg">
        <p className="text-white">{t('not_in_party')}</p>
          </div>
        )}
      </div>
      <div className="container mx-auto p-6 space-y-6">
        <Card className="bg-gray-900/70 border-gray-400 border-0">
            <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('table_label')} {table.name}</span>
              <Badge variant="outline">{parties?.length || 0} {t('parties_label')}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Create Party Form */}
            <form onSubmit={handleCreateParty} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Party name */}
              <div className="w-full">
                <Label htmlFor="partyName">{t('party_name_placeholder_title')}</Label>
                <Input
                  id="partyName"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder={t('party_name_placeholder') || 'Party name'}
                  className="w-full"
                  autoFocus
                />
              </div>

              {/* Party password (optional) */}
              <div className="w-full">
                <Label htmlFor="partyPassword">{t('party_password_placeholder_title')}</Label>
                <Input
                  id="partyPassword"
                  type="password"
                  value={partyPassword}
                  onChange={(e) => setPartyPassword(e.target.value)}
                  placeholder={t('party_password_placeholder') || 'Optional password'}
                  className="w-full"
                />
              </div>

              {/* Submit / Create party */}
              <div className="mt-4 flex items-center justify-end sm:col-span-2">
                <Button type="submit">
                  {t('create_party') || 'Create party'}
                </Button>
              </div>
            </form>
            <h3 className="text-lg font-semibold mb-4">{t('active_parties')}</h3>
            {!parties || parties.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('no_parties')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {parties.map((party: any, index: number) => (
                  <div key={party._id}>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-gray-400">
                      <span className="font-medium">{party.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {party.closed ? t('closed') : t('active')}
                        </Badge>
                        {/* member count (server-side) */}
                        <Badge variant="outline">
                          {memberCounts?.find((c: any) => c.partyId === party._id)?.count ?? 0}
                        </Badge>
                        
                        {/* Add join/joined status */}
                        {currentParty === party._id ? (
                          <Badge variant="default" className="bg-blue-600">
                            {t('joined')}
                          </Badge>
                        ) : (
                            <Button
                            variant="outline"
                            size="sm"
                            className="transition-colors hover:bg-blue-100 hover:border-blue-500 hover:text-blue-700"
                            onClick={() => handleJoinParty(party)}
                          >
                            {t('join')}
                          </Button>
                        )}
                        
                        {!party.closed && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCloseParty(party._id)}
                          >
                            {t('close')}
                          </Button>
                        )}
                      </div>
                    </div>
                    {index < parties.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}