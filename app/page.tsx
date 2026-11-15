import type { Metadata } from "next";
import HomeJourney from "@/components/home/HomeJourney";

export const metadata: Metadata = {
  title: "gAIa",
};

export default function HomePage() {
  return <HomeJourney />;
}
