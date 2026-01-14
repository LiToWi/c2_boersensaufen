'use client'
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { ChevronDown, ChevronUp, Users, X, Lock } from "lucide-react";
import { toast } from "sonner";


export default function Parties() {
    const { t } = useLanguage();
    const data = useQuery(api.parties.getAllParties)
    const [expandedPartyId, setExpandedPartyId] = useState<string | null>(null);

    if (data === undefined) {
        return (<div className="p-4">{t('loading') || 'Loading...'}</div>)
    }

    // Group parties by table
    const partiesByTable = data.reduce((acc: Record<string, any[]>, party: any) => {
        const key = party.tableId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(party);
        return acc;
    }, {});

    // Get unique tables and sort
    const tables = Object.keys(partiesByTable).map(tableId => {
        const firstParty = partiesByTable[tableId][0];
        return { id: tableId, ...firstParty };
    });

    return (
        <div className="space-y-6 p-4">
            <div>
                <h1 className="text-4xl font-serif mb-2">{t('parties') || 'Parties'}</h1>
                <p className="text-gray-400">{t('total') || 'Total'}: {data.length} {t('parties') || 'parties'} / {tables.length} {t('tables') || 'tables'}</p>
            </div>

            <div className="space-y-6">
                {tables.length === 0 ? (
                    <Card className="bg-slate-900/80 border-gray-700/40">
                        <CardContent className="p-6">
                            <p className="text-gray-400">{t('no_parties') || 'No parties at this table yet.'}</p>
                        </CardContent>
                    </Card>
                ) : (
                    tables.map((table) => (
                        <TableSection
                            key={table.id}
                            tableId={table.id}
                            parties={partiesByTable[table.id]}
                            expandedPartyId={expandedPartyId}
                            onToggle={setExpandedPartyId}
                        />
                    ))
                )}
            </div>
        </div>
    )
}

function TableSection({ tableId, parties, expandedPartyId, onToggle }: { tableId: string, parties: any[], expandedPartyId: string | null, onToggle: (id: string | null) => void }) {
    const { t } = useLanguage();
    const table = useQuery(api.tables.getTableByID, { tableID: tableId as Id<"tables"> })
    const openParties = parties.filter(p => !p.closed);
    const closedParties = parties.filter(p => p.closed);

    return (
        <Card className="bg-slate-900/80 border-blue-500/40">
            <CardHeader className="pb-3">
                <CardTitle className="text-xl">{table?.name || 'Loading...'}</CardTitle>
                <p className="text-sm text-gray-400">
                    {openParties.length} {t('open') || 'open'} · {closedParties.length} {t('closed') || 'closed'}
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {parties.length === 0 ? (
                    <p className="text-gray-400 text-sm">{t('no_parties') || 'No parties'}</p>
                ) : (
                    parties.map((party) => (
                        <PartyCard
                            key={party._id}
                            party={party}
                            isExpanded={expandedPartyId === party._id}
                            onToggle={() => onToggle(expandedPartyId === party._id ? null : party._id)}
                        />
                    ))
                )}
            </CardContent>
        </Card>
    )
}

function PartyCard({ party, isExpanded, onToggle }: { party: any, isExpanded: boolean, onToggle: () => void }) {
    const { t } = useLanguage();
    const table = useQuery(api.tables.getTableByID, { tableID: party.tableId as Id<"tables"> })
    const summary = useQuery(api.drinks.getPartyOrderSummary, { partyId: party._id as Id<"parties">, includeFinalized: true })
    const memberCount = useQuery(api.partyMembers.getPartyMemberCount, { partyId: party._id as Id<"parties"> })
    const allTimeMembers = useQuery(api.partyMembers.getAllTimePartyMembers, { partyId: party._id as Id<"parties"> })
    const adminCloseParty = useMutation(api.parties.adminCloseParty);
    const [isClosing, setIsClosing] = useState(false);

    const handleCloseParty = async () => {
        try {
            setIsClosing(true);
            await adminCloseParty({ partyId: party._id as Id<"parties"> });
            toast.success(t('party_closed') || 'Party closed successfully');
        } catch (error: any) {
            toast.error(error.message || (t('error_closing_party') || 'Failed to close party'));
        } finally {
            setIsClosing(false);
        }
    };

    return (
        <Card className={`bg-slate-900/80 border-gray-700/40 cursor-pointer transition-all ${isExpanded ? 'ring-2 ring-blue-500/50' : ''}`} onClick={onToggle}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        <button className="p-1 hover:bg-gray-800 rounded">
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                        <div>
                            <CardTitle className="text-lg">{party.name}</CardTitle>
                            <p className="text-sm text-gray-400">{t('table') || 'Table'}: {table?.name || 'Loading...'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className={party.closed ? 'bg-red-900/80 border-red-500/40 text-red-100' : 'bg-green-900/80 border-green-500/40 text-green-100'}>
                            {party.closed ? (t('closed') || 'Closed') : (t('open') || 'Open')}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            {isExpanded && (
                <>
                    <CardContent className="space-y-4">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-4 gap-3 p-3 bg-slate-800/50 rounded">
                            <div>
                                <p className="text-xs text-gray-400">{t('active_members') || 'Active Members'}</p>
                                <p className="text-xl font-bold">{memberCount || 0}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">{t('all_time_members') || 'All-time Members'}</p>
                                <p className="text-xl font-bold text-blue-400">{allTimeMembers?.length || 0}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">{t('total') || 'Total'} (€)</p>
                                <p className="text-xl font-bold">{summary?.totalPrice?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">{t('fees') || 'Fees'} (€)</p>
                                <p className="text-xl font-bold text-green-400">{summary?.totalFees?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>

                        {/* Savings Row */}
                        <div className="p-3 bg-slate-800/30 rounded border border-slate-700/40">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">{t('savings') || 'Savings'}</span>
                                <span className="text-lg font-bold text-yellow-400">{summary?.totalSavings?.toFixed(2) || '0.00'} €</span>
                            </div>
                        </div>

                        {/* Members Section */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {t('members') || 'Members'}
                            </h3>
                            <p className="text-xs text-gray-500 mb-2">{t('kick_member_help') || 'Remove members who need to leave or haven’t settled.'}</p>
                            <PartyMembers partyId={party._id} />
                        </div>

                        {/* Orders Section */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-300 mb-2">{t('order_history') || 'Order History'}</h3>
                            <PartyOrders partyId={party._id} />
                        </div>

                        {/* Admin Actions */}
                        {!party.closed && (
                            <div className="pt-4 border-t border-gray-700/40">
                                <Button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCloseParty();
                                    }}
                                    disabled={isClosing}
                                    variant="destructive"
                                    className="w-full"
                                    title={t('close_party_help') || 'Closes the party immediately. Orders remain for settlement.'}
                                >
                                    <Lock className="h-4 w-4 mr-2" />
                                    {isClosing ? (t('closing') || 'Closing...') : (t('close_party') || 'Close Party')}
                                </Button>
                                <p className="text-xs text-gray-500 mt-2 text-center">{t('close_party_help') || 'Closes the party immediately. Orders remain for settlement.'}</p>
                            </div>
                        )}
                    </CardContent>
                </>
            )}
        </Card>
    )
}

function PartyMembers({ partyId }: { partyId: string }) {
    const { t } = useLanguage();
    const members = useQuery(api.partyMembers.getPartyMembers, { partyId: partyId as Id<"parties"> })
    const kickMember = useMutation(api.partyMembers.kickMember);
    const [kickingId, setKickingId] = useState<string | null>(null);

    const handleKickMember = async (memberId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            setKickingId(memberId);
            await kickMember({ memberId: memberId as Id<"partyMembers"> });
            toast.success(t('member_kicked') || 'Member kicked');
        } catch (error: any) {
            toast.error(error.message || (t('error_kicking_member') || 'Failed to kick member'));
        } finally {
            setKickingId(null);
        }
    };

    if (members === undefined) {
        return <div className="text-sm text-gray-400">{t('loading') || 'Loading...'}</div>
    }

    if (!members || members.length === 0) {
        return <div className="text-sm text-gray-400">{t('no_members') || 'No members yet'}</div>
    }

    return (
        <div className="bg-slate-800/30 rounded p-3 space-y-2">
            {members.map((member: any) => (
                <div key={member._id} className="flex items-center justify-between text-sm p-2 hover:bg-slate-700/30 rounded">
                    <div className="flex-1">
                        <span className="text-gray-300">{member.memberKey}</span>
                        <p className="text-xs text-gray-500">
                            {t('joined') || 'Joined'}: {new Date(member.joinedAt).toLocaleTimeString()}
                        </p>
                    </div>
                    <Button
                        onClick={(e) => handleKickMember(member._id, e)}
                        disabled={kickingId === member._id}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
                        title={t('kick_member_help') || 'Remove members who need to leave or haven’t settled.'}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ))}
        </div>
    )
}

function PartyOrders({ partyId }: { partyId: string }) {
    const { t } = useLanguage();
    const orders = useQuery(api.drinks.getPartyOrders, { partyId: partyId as Id<"parties"> })

    if (orders === undefined) {
        return <div className="text-sm text-gray-400">{t('loading') || 'Loading...'}</div>
    }

    if (!orders || orders.length === 0) {
        return <div className="text-sm text-gray-400">{t('no_orders_yet') || 'No orders yet'}</div>
    }

    return (
        <div className="bg-slate-800/30 rounded overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="border-gray-700/40">
                        <TableHead className="text-xs">{t('drink') || 'Drink'}</TableHead>
                        <TableHead className="text-xs text-center">{t('quantity') || 'Qty'}</TableHead>
                        <TableHead className="text-xs text-right">{t('price') || 'Price'}</TableHead>
                        <TableHead className="text-xs text-right">{t('savings') || 'Savings'}</TableHead>
                        <TableHead className="text-xs">{t('status') || 'Status'}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map((order: any) => (
                        <TableRow key={order._id} className="border-gray-700/20 text-sm">
                            <TableCell>{order.drinkName}</TableCell>
                            <TableCell className="text-center">{order.quantity}</TableCell>
                            <TableCell className="text-right">€{(order.priceAtOrder * order.quantity).toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                                <span className={(order.regularPriceAtOrder - order.priceAtOrder) * order.quantity > 0 ? 'text-green-400' : (order.regularPriceAtOrder - order.priceAtOrder) * order.quantity < 0 ? 'text-red-400' : 'text-gray-400'}>
                                  €{((order.regularPriceAtOrder - order.priceAtOrder) * order.quantity).toFixed(2)}
                                </span>
                            </TableCell>
                            <TableCell>
                                <Badge variant={order.finalized ? "default" : "outline"} className="text-xs">
                                    {order.finalized ? (t('finalized') || 'Finalized') : (t('pending') || 'Pending')}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}