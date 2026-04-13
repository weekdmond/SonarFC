import { NextRequest, NextResponse } from "next/server";

import { getSiteSnapshot } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();

  if (query.length < 2) {
    return NextResponse.json({
      competitions: [],
      teams: [],
      players: [],
    });
  }

  const snapshot = await getSiteSnapshot();
  const teamById = new Map(snapshot.teams.map((team) => [team.id, team]));

  const competitions = snapshot.competitions
    .filter((competition) => {
      const haystack = `${competition.slug} ${competition.region} ${competition.name.zh} ${competition.name.en}`.toLowerCase();
      return haystack.includes(query);
    })
    .slice(0, 5)
    .map((competition) => ({
      id: competition.id,
      name: competition.name,
      subtitle: competition.region,
      href: competition.id === "fifa-world-cup" ? "/world-cup" : `/competition/${competition.slug}`,
      icon: competition.icon,
    }));

  const teams = snapshot.teams
    .filter((team) => {
      const haystack = `${team.slug} ${team.name} ${team.shortName} ${team.country} ${team.city}`.toLowerCase();
      return haystack.includes(query);
    })
    .slice(0, 6)
    .map((team) => ({
      id: team.id,
      name: team.name,
      subtitle: team.country,
      href: `/team/${team.slug}`,
      icon: team.badge,
    }));

  const players = snapshot.players
    .filter((player) => {
      const haystack = `${player.slug} ${player.name} ${player.nationality} ${player.position}`.toLowerCase();
      return haystack.includes(query);
    })
    .slice(0, 8)
    .map((player) => ({
      slug: player.slug,
      name: player.name,
      subtitle: `${teamById.get(player.teamId)?.name ?? ""} · ${player.position}`,
      href: `/player/${player.slug}`,
      photo: player.photo ?? "",
    }));

  return NextResponse.json({
    competitions,
    teams,
    players,
  });
}
