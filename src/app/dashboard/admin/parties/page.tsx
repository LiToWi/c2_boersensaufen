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
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";


export default function Parties() {

    const data = useQuery(api.parties.getAllParties)
    console.log(data)

    if (data === undefined) {
        return (<div>Loading...</div>)
    }

    return (
        <div>
            <h1 className="text-4xl font-serif">Parties</h1>

            <Table className="caption-top">
                <TableCaption>Alle Parties</TableCaption>
                <TableHeader className="text-lg">
                    <TableRow>
                        <TableHead className="w-[100px]">Tisch</TableHead>
                        <TableHead>Partyname</TableHead>
                        <TableHead className="text-right">Umsatz</TableHead>
                        <TableHead className="text-right">Ersparniss</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((party: { _id: string, closed: boolean, name: string, tableId: string }) => {
                        console.log(party)
                        return (
                            <PartyRow key={party._id} party={party} />
                        )
                    })}
                </TableBody>
            </Table>

        </div >
    )
}

function PartyRow({ party }: any) {
    const table = useQuery(api.tables.getTableByID, { tableID: party.tableId as Id<"tables"> })
    const sum = useQuery(api.drinks.getPartyOrderSummary, { partyId: party._id as Id<"parties"> })

    console.log(sum)

    return (
        <TableRow>
            <TableCell>{table?.name}</TableCell>
            <TableCell>{party.name}</TableCell>
            <TableCell className="text-right">{sum?.totalPrice}€</TableCell>
            <TableCell className="text-right">{}</TableCell>
        </TableRow>
    )
}