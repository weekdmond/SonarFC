export const dynamic = "force-dynamic";

import { MyScreen } from "@/components/my-screen";
import { getSiteSnapshot } from "@/lib/site-data";

export default async function MyPage() {
  const snapshot = await getSiteSnapshot();

  return (
    <MyScreen
      competitions={snapshot.competitions}
      matches={snapshot.matches}
      teams={snapshot.teams}
    />
  );
}
