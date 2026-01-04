"use client"

import { api } from 'convex/_generated/api';
import { getPartyOrderSummary } from 'convex/drinks';
import { getAllParties } from 'convex/parties';
import { useConvex, useQuery } from 'convex/react';
import { NextResponse } from 'next/server';

export async function partyList() {
  try {

    const data = useQuery(api.parties.getAllParties)
    console.log(data)

    return NextResponse.json({body: data}, {status: 200});
  } catch (err) {
    console.log(err);
  }

}