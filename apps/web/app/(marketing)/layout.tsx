import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { getBaseUrl } from "@/lib/base-url";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const baseUrl = getBaseUrl();

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "FinAgevolata",
    url: baseUrl,
    logo: `${baseUrl}/opengraph-image`,
    sameAs: [] as string[],
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "FinAgevolata",
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
