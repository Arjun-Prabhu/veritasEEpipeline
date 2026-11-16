import { Suspense } from "react";
import type { Metadata } from "next";
import ExploreGallery from "@/components/explore/ExploreGallery";

export const metadata: Metadata = {
  title: "gAIa",
  description: "Continents, landmarks, and readings saved on this device.",
};

export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreGallery />
    </Suspense>
  );
}
