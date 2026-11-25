import { SportsBoard } from "@/components/sports-board";
import { getBasketballFixtures } from "@/lib/sports";

export const dynamic = "force-dynamic";

export default async function NbaPage() {
  const data = await getBasketballFixtures();

  return <SportsBoard data={data} sport="nba" />;
}
