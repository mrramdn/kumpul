import { Download } from "lucide-react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { ApiDocs } from "@/components/api-docs";
import { buttonClass, pageClass } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.docs.title };
}

// Dokumentasi interaktif dari spesifikasi di /api/openapi.json (src/lib/openapi.ts).
export default async function ApiDocsPage() {
  const t = await getDictionary();
  return (
    <div className={pageClass}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-h1">{t.docs.title}</h1>
          <p className="mt-1 max-w-3xl type-small text-muted-foreground">{t.docs.subtitle}</p>
        </div>
        <a href="/api/openapi.json" download className={buttonClass("secondary", "small")}>
          <Download aria-hidden className="size-4" />
          {t.docs.download}
        </a>
      </div>
      <ApiDocs />
    </div>
  );
}
