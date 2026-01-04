"use client"

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
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
import LoadingAnimation from "@/components/LoadingAnimation";
import { useLanguage } from '@/contexts/LanguageContext'

export default function TablePage() {
  const { t } = useLanguage()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [partyName, setPartyName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  
  // Add party context
  const { currentTable, currentParty, partyName: currentPartyName, setCurrentParty, clearCurrentParty } = useParty()

  // member tracking
  const [memberKey, setMemberKey] = useState<string | null>(null);
  const createMember = useMutation(api.partyMembers.createMember);
  const leaveMember = useMutation(api.partyMembers.leaveMember);

  useEffect(() => {
      if (status === 'loading') return
      if (!session) router.push('/login')
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
  const createParty = useMutation(api.parties.createParty);
  const closeParty = useMutation(api.parties.closeParty);

  async function handleCreateParty() {
    if (!partyName.trim() || !table?._id) return;
    
    setIsCreating(true);
    try {
      const newParty = await createParty({ name: partyName, tableId: table._id });
      setPartyName('');
      
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
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCloseParty(partyId: string) {
    try {
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      await closeParty({ partyId: partyId as any });
      
      // If the current party is being closed, clear it
      if (currentParty === partyId) {
        try {
          if (memberKey) await leaveMember({ partyId: partyId as any, memberKey });
        } catch (err) {
          console.error('leaveMember failed during closeParty', err);
        }
        clearCurrentParty();
      }
    } catch (error) {
      console.error('Error closing party:', error);
    }
  }

  // Add join party function
  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
  async function handleJoinParty(party: any) {
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
  
  if (loading) return <LoadingAnimation />;

  if (status === 'loading') return <TableSkeleton />
  if (!session) return <div><LoadingAnimation /></div>

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
            <div className="mb-6 p-4 border border-gray-400 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">{t('create_new_party')}</h3>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="partyName" className="sr-only">{t('party_name')}</Label>
                  <Input
                    id="partyName"
                    placeholder={t('enter_party_name')}
                    value={partyName}
                    className="border-gray-400"
                    onChange={(e) => setPartyName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateParty();
                      }
                    }}
                  />
                </div>
                <Button 
                  onClick={handleCreateParty}
                  disabled={!partyName.trim() || isCreating}
                >
                  {isCreating ? t('creating') : t('create_and_join')}
                </Button>
              </div>
            </div>
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