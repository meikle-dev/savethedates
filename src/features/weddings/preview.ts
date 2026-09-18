import "server-only";
import type { Wedding } from "./wedding";

// Explicit fictional development fixtures. Never a publication data source.
export function getDevelopmentWedding(slug: string): Wedding | null {
  if (process.env.NODE_ENV !== "development") return null;

  const base: Wedding = {
    names: ["Chloe", "Ross"],
    date: "2027-06-14",
    location: "Lake Como, Italy",
    message: "We’re getting married and would love you to be part of our special day.",
  };

  if (slug === "demo") {
    return {
      ...base,
      image: { src: "/preview-photo", alt: "Boats and a quiet pier on Lake Como, with mountains beyond." },
    };
  }
  if (slug === "demo-no-photo") return { ...base, message: undefined };
  if (slug === "demo-long-names") {
    return { ...base, names: ["Alexandra-Marguerite", "Christopher-Alexander"] };
  }
  return null;
}
