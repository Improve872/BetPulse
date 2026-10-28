import { HomeLobby } from "@/components/home-lobby";
import { getLobbyData } from "@/lib/catalog";
import { getLiveMarkets } from "@/lib/markets";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [data, markets] = await Promise.all([getLobbyData(), getLiveMarkets()]);

  return <HomeLobby data={data} markets={markets} />;
}
