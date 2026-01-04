import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function Parties() {

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
                    <TableRow>
                    <TableCell className="font-medium">INV001</TableCell>
                    <TableCell>Paid</TableCell>
                    <TableCell>Credit Card</TableCell>
                    <TableCell className="text-right">$250.00</TableCell>
                    </TableRow>
                </TableBody>
                </Table>

        </div>
    )
}