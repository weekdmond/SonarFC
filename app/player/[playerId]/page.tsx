export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { PlayerScreen } from "@/components/player-screen";
import { getSiteSnapshot } from "@/lib/site-data";

export default async function PlayerPage({
  params,
}: {
  params: { playerId: string };
}) {
  const snapshot = await getSiteSnapshot();
  const player = snapshot.players.find((item) => item.slug === params.playerId);

  if (!player) {
    notFound();
  }

  return (
    <PlayerScreen
      player={player}
      teams={snapshot.teams}
      competitions={snapshot.competitions}
      matches={snapshot.matches.filter(
        (item) => item.home.teamId === player.teamId || item.away.teamId === player.teamId
      )}
    />
  );
}
