"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Trinks() {
    const { t } = useLanguage();
    const orders = useQuery(api.adminQueries.getLiveOrders);

    if (orders === undefined) {
        return <div className="p-4 text-sm text-gray-400">{t('loading') || 'Loading...'}</div>;
    }

    return (
        <Card className="bg-slate-900/80 border-blue-500/40">
            <CardHeader>
                <CardTitle>{t('live_orders') || 'Live Orders'}</CardTitle>
                <p className="text-sm text-gray-400">{t('live_orders_hint') || 'Latest 200 orders across all tables'}</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-700/40">
                            <TableHead className="text-xs">{t('time') || 'Time'}</TableHead>
                            <TableHead className="text-xs">{t('table') || 'Table'}</TableHead>
                            <TableHead className="text-xs">{t('party_name') || 'Party'}</TableHead>
                            <TableHead className="text-xs">{t('drink') || 'Drink'}</TableHead>
                            <TableHead className="text-xs text-center">{t('quantity') || 'Qty'}</TableHead>
                            <TableHead className="text-xs text-right">{t('ordered_price') || 'Order Price'}</TableHead>
                            <TableHead className="text-xs text-right">{t('regular_price') || 'Regular'}</TableHead>
                            <TableHead className="text-xs text-right">Preisdifferenz</TableHead>
                            <TableHead className="text-xs text-right">{t('fees') || 'Fees'}</TableHead>
                            <TableHead className="text-xs text-right">{t('house_edge') || 'Gain'}</TableHead>
                            <TableHead className="text-xs text-center">{t('status') || 'Status'}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order: any) => {
                            const regular = order.regularPriceAtOrder ?? order.priceAtOrder;
                            const gainValue = (order.priceAtOrder - regular) * order.quantity + (order.feePaid ?? 0);
                            return (
                                <TableRow key={order._id} className="border-gray-700/20">
                                    <TableCell className="text-xs text-gray-300 whitespace-nowrap">{new Date(order.orderCreatedAt || order.createdAt).toLocaleTimeString()}</TableCell>
                                    <TableCell className="text-sm">{order.tableName}</TableCell>
                                    <TableCell className="text-sm">{order.partyName}</TableCell>
                                    <TableCell className="text-sm">{order.drinkName}</TableCell>
                                    <TableCell className="text-center">{order.quantity}</TableCell>
                                    <TableCell className="text-right">€{(order.priceAtOrder * order.quantity).toFixed(2)}</TableCell>
                                    <TableCell className="text-right">€{(regular * order.quantity).toFixed(2)}</TableCell>
                                    <TableCell className={`text-right ${(order.priceAtOrder - regular) * order.quantity > 0 ? 'text-emerald-300' : (order.priceAtOrder - regular) * order.quantity < 0 ? 'text-red-300' : 'text-gray-400'}`}>€{((order.priceAtOrder - regular) * order.quantity).toFixed(2)}</TableCell>
                                    <TableCell className="text-right text-indigo-300">€{(order.feePaid ?? 0).toFixed(2)}</TableCell>
                                    <TableCell className={`text-right ${gainValue >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>€{gainValue.toFixed(2)}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={order.finalized ? "default" : "outline"} className="text-xs">
                                            {order.finalized ? (t('finalized') || 'Finalized') : (t('pending') || 'Pending')}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}