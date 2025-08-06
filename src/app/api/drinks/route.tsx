// app/api/drinks/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // assumes a singleton Prisma client

export async function GET() {
  try {
    const drinks = await prisma.drink.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(drinks);
  } catch (error) {
    console.error('Error fetching drinks:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

export function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
