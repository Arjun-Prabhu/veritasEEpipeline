import type { Metadata } from "next";
import Analyzer from "@/components/analyze/Analyzer";

export const metadata: Metadata = {
  title: "Analyzer",
  description: "Ask gAIa how a place has changed, then compare the years.",
};

export default function AnalyzePage() {
  return <Analyzer />;
}
