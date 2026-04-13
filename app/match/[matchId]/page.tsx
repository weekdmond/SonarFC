export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { MatchDetailScreen } from "@/components/match-detail-screen";
import { getMatchPageData } from "@/lib/site-data";

export default async function MatchPage({
  params,
}: {
  params: { matchId: string };
}) {
  const { snapshot, match } = await getMatchPageData(params.matchId);

  if (!match) {
    notFound();
  }

  return (
    <MatchDetailScreen
      match={match}
      matches={snapshot.matches}
      competitions={snapshot.competitions}
      teams={snapshot.teams}
      homePlayers={snapshot.players.filter((item) => item.teamId === match.home.teamId)}
      awayPlayers={snapshot.players.filter((item) => item.teamId === match.away.teamId)}
    />
  );
}
