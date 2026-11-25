import { HomeLobby } from "@/components/home-lobby";
import { getLobbyData } from "@/lib/catalog";
import { getLiveMarkets } from "@/lib/markets";
import { getBasketballFixtures, getFixtures } from "@/lib/sports";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [data, markets, soccer, basketball] = await Promise.all([
    getLobbyData(),
    getLiveMarkets(),
    getFixtures(),
    getBasketballFixtures(),
  ]);

  return (
    <HomeLobby
      data={data}
      markets={markets}
      soccer={soccer}
      basketball={basketball}
    />
  );
}
