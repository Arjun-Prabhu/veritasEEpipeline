import type { Metadata } from "next";
import LunaRoom from "@/components/luna/LunaRoom";

export const metadata: Metadata = {
  title: "gAIa",
  description: "Talk with Luna about satellites, land, and the environment.",
};

export default function LunaPage() {
  return <LunaRoom />;
}
