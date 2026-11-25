import { SportsBoard } from "@/components/sports-board";
import { getFixtures } from "@/lib/sports";

export const dynamic = "force-dynamic";

export default async function SportsPage() {
  const data = await getFixtures();

  return <SportsBoard data={data} sport="football" />;
}
