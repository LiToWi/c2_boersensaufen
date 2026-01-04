'use client'
import { partyList } from "@/app/api/admin/parties"
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
import { useQuery } from "convex/react";


export default function Parties() {



    partyList();

    const data = useQuery(api.parties.getAllParties)

    if (data === undefined) {
        return (<div>Loading...</div>)
    }

    return (
        <div>
            <h1 className="text-4xl font-serif">Parties</h1>

            <Table className="">
                <TableCaption>A list of your recent invoices.</TableCaption>
                <TableHeader className="text-lg">
                    <TableRow>
                        <TableHead className="w-[100px]">Tisch</TableHead>
                        <TableHead>Partyname</TableHead>
                        <TableHead className="text-right">Umsatz</TableHead>
                        <TableHead className="text-right">Ersparniss</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((party) => (
                        <PartyRow key={party._id} party={party} />
                    ))}
                </TableBody>
            </Table>

        </div >
    )
}

function PartyRow(party: any) {
    const table = useQuery(api.tables.getTableByID, { tableID: party.tableId })

    return (

        <TableRow>
            <TableCell>{table?.name}</TableCell>
            <TableCell>{party.name}</TableCell>
            <TableCell>Credit Card</TableCell>
            <TableCell className="text-right">$250.00</TableCell>
        </TableRow>
    )
}