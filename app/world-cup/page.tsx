export const dynamic = "force-dynamic";

import { WorldCupScreen } from "@/components/world-cup-screen";
import { getSiteSnapshot } from "@/lib/site-data";

export default async function WorldCupPage() {
  const snapshot = await getSiteSnapshot();
  const competition = snapshot.competitions.find((item) => item.id === "fifa-world-cup");

  if (!competition) {
    return null;
  }

  return (
    <WorldCupScreen
      competition={competition}
      matches={snapshot.matches.filter((item) => item.competitionId === competition.id)}
      newsItems={snapshot.newsItems.filter((item) => item.competitionIds.includes(competition.id))}
      worldCupTeams={snapshot.worldCupTeams}
      teams={snapshot.teams}
    />
  );
}
