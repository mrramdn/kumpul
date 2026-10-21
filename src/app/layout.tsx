import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata } from "next";
import { dictionaries, getLang, getTheme } from "@/i18n";
import { DictionaryProvider } from "@/components/dictionary-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = dictionaries[await getLang()];
  return {
    title: { default: "Kumpul", template: "%s · Kumpul" },
    description: t.meta.description,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [lang, theme] = await Promise.all([getLang(), getTheme()]);
  const t = dictionaries[lang];

  return (
    <html lang={lang} className={theme === "dark" ? "dark" : undefined}>
      <body className="flex min-h-dvh flex-col">
        <DictionaryProvider dictionary={t}>
          <SiteHeader t={t} lang={lang} theme={theme} />
          <main className="flex-1">{children}</main>
          <SiteFooter t={t} />
        </DictionaryProvider>
      </body>
    </html>
  );
}
