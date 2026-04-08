export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { TeamScreen } from "@/components/team-screen";
import { getSiteSnapshot } from "@/lib/site-data";

export default async function TeamPage({
  params,
}: {
  params: { teamId: string };
}) {
  const snapshot = await getSiteSnapshot();
  const team = snapshot.teams.find((item) => item.slug === params.teamId);

  if (!team) {
    notFound();
  }

  const teamMatches = snapshot.matches.filter(
    (item) => item.home.teamId === team.id || item.away.teamId === team.id
  );
  const primaryCompetitionId = teamMatches[0]?.competitionId;

  return (
    <TeamScreen
      team={team}
      teams={snapshot.teams}
      competitions={snapshot.competitions}
      matches={teamMatches}
      competitionMatches={
        primaryCompetitionId
          ? snapshot.matches.filter((item) => item.competitionId === primaryCompetitionId)
          : []
      }
      players={snapshot.players.filter((item) => item.teamId === team.id)}
    />
  );
}
