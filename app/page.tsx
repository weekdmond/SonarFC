export const dynamic = "force-dynamic";

import { HomeFeedScreen } from "@/components/home-feed-screen";
import { getSiteSnapshot } from "@/lib/site-data";

export default async function Page() {
  const snapshot = await getSiteSnapshot();

  return (
    <HomeFeedScreen
      competitions={snapshot.competitions}
      teams={snapshot.teams}
      matches={snapshot.matches}
      newsItems={snapshot.newsItems}
    />
  );
}
