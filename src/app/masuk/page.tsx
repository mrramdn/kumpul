import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { LoginForm } from "@/components/login-form";
import { authEnabled } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.login.title };
}

// Hanya alamat di situs ini sendiri ("/acara/..."), bukan "//situs-lain.com", supaya tidak bisa dipakai
// untuk mengalihkan pengguna ke situs lain.
function safeNext(value: string | string[] | undefined) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function LoginPage({ searchParams }: PageProps<"/masuk">) {
  const t = await getDictionary();
  const next = safeNext((await searchParams).lanjut);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-10">
      <h1 className="type-h2">{t.login.title}</h1>
      <p className="mt-2 mb-6 type-small text-muted-foreground">{t.login.subtitle}</p>
      {authEnabled() ? (
        <LoginForm next={next} />
      ) : (
        <p className="rounded-lg bg-secondary px-4 py-3 type-small">{t.login.openMode}</p>
      )}
    </div>
  );
}
