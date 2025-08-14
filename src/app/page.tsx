'use client'

import { useEffect } from "react";
import { useParty } from "../contexts/PartyContext";

export default function HomePage() {
  const { currentTable, currentParty, partyName} = useParty();

  useEffect(() => {
    console.log("Current Party Info:", {
      currentTable,
      currentParty,
      partyName
    });
  }, [currentTable, currentParty, partyName]);

  return (
    <main className="flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold font-unica">Servus,</h1>
        <p className="mt-4 font-vollkorn">
          scan your table QR code to join the bar stock exchange!!!
        </p>
      </div>
    </main>
  );
}