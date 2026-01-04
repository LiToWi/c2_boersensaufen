import { getAllParties } from 'convex/parties';
import { NextResponse } from 'next/server';

export async function partyList() {
  try {

    const parties = getAllParties

    console.log(parties)

    return NextResponse.json({body: "ok"}, {status: 200});
  } catch (err) {
    console.log(err);
  }

}