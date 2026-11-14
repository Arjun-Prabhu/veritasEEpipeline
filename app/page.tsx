import type { Metadata } from "next";
import ScrollEarth from "@/components/home/ScrollEarth";

export const metadata: Metadata = {
  title: "gAIa — Every pixel tells a story",
};

export default function HomePage() {
  return <ScrollEarth />;
}
