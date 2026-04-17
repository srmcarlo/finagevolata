import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://axentraitalia.cloud";
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
