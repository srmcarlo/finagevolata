import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/base-url";

export default function robots(): MetadataRoute.Robots {
  const base = getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/features", "/prezzi", "/contatti", "/privacy", "/termini", "/cookie"],
        disallow: ["/api/", "/admin", "/consulente", "/azienda", "/onboarding", "/login", "/register"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
