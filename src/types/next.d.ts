// File: /types/next.d.ts
import { Server as HTTPServer } from 'http';
import { Socket } from 'net';
import { Server as IOServer } from 'socket.io';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: Socket & {
    server: HTTPServer & {
      io: IOServer;
    };
  };
};
