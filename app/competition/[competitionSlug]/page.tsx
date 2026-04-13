export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { CompetitionScreen } from "@/components/competition-screen";
import { getSiteSnapshot } from "@/lib/site-data";

export default async function CompetitionPage({
  params,
}: {
  params: { competitionSlug: string };
}) {
  const snapshot = await getSiteSnapshot();
  const competition = snapshot.competitions.find(
    (item) => item.slug === params.competitionSlug
  );

  if (!competition) {
    notFound();
  }

  return (
    <CompetitionScreen
      competition={competition}
      matches={snapshot.matches.filter((item) => item.competitionId === competition.id)}
      newsItems={snapshot.newsItems.filter((item) => item.competitionIds.includes(competition.id))}
      teams={snapshot.teams}
      players={snapshot.players}
    />
  );
}
