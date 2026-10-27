import { HomeLobby } from "@/components/home-lobby";
import { getLobbyData } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getLobbyData();

  return <HomeLobby data={data} />;
}
