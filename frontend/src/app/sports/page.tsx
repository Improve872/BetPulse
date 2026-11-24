import { SportsBoard } from "@/components/sports-board";
import { getBasketballFixtures, getFixtures } from "@/lib/sports";

export const dynamic = "force-dynamic";

export default async function SportsPage() {
  const [soccer, basketball] = await Promise.all([
    getFixtures(),
    getBasketballFixtures(),
  ]);

  return <SportsBoard soccer={soccer} basketball={basketball} />;
}
