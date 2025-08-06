"use client";

import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io();

export default function TablePage({ 
  params 
}: { 
  params: Promise<{ session: string }> 
}) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [session, setSession] = useState<string>('');

  useEffect(() => {
    // Resolve the params Promise
    params.then((resolvedParams) => {
      setSession(resolvedParams.session);
      socket.emit('join-session', resolvedParams.session);
    });

    socket.on('price-update', (data) => {
      setPrices(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [params]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Table {session}</h2>
      <ul>
        {Object.entries(prices).map(([drink, price]) => (
          <li key={drink} className="mb-2">
            <span className="font-semibold">{drink}</span>: €{price.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}