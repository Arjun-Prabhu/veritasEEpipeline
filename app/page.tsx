import type { Metadata } from "next";
import ScrollEarth from "@/components/home/ScrollEarth";

export const metadata: Metadata = {
  title: "gAIa",
};

export default function HomePage() {
  return <ScrollEarth />;
}
