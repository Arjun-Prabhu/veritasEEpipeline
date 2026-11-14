import type { Metadata } from "next";
import ExploreGallery from "@/components/explore/ExploreGallery";

export const metadata: Metadata = {
  title: "Explore",
  description: "Case studies and readings saved on this device.",
};

export default function ExplorePage() {
  return <ExploreGallery />;
}
