import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io();

export default function TablePage({ params }: { params: { session: string } }) {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    socket.emit('join-session', params.session);
    socket.on('price-update', (data) => {
      setPrices(data);
    });
    return () => {
      socket.disconnect();
    };
  }, [params.session]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Table {params.session}</h2>
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