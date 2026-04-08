export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { MatchDetailScreen } from "@/components/match-detail-screen";
import { getSiteSnapshot } from "@/lib/site-data";

export default async function MatchPage({
  params,
}: {
  params: { matchId: string };
}) {
  const snapshot = await getSiteSnapshot();
  const match = snapshot.matches.find((item) => item.slug === params.matchId);

  if (!match) {
    notFound();
  }

  return (
    <MatchDetailScreen
      match={match}
      matches={snapshot.matches}
      competitions={snapshot.competitions}
      teams={snapshot.teams}
    />
  );
}
