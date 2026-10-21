import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/redirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.login.title };
}

export default async function LoginPage({ searchParams }: PageProps<"/masuk">) {
  const [t, user] = await Promise.all([getDictionary(), getCurrentUser()]);
  const next = safeNext((await searchParams).lanjut);
  if (user) redirect(next);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-10">
      <h1 className="type-h2">{t.login.title}</h1>
      <p className="mt-2 mb-6 type-small text-muted-foreground">{t.login.subtitle}</p>
      <AuthForm mode="login" next={next} />
      <p className="mt-6 text-center type-small text-muted-foreground">
        {t.login.noAccount}{" "}
        <Link href={`/daftar?lanjut=${encodeURIComponent(next)}`} className="font-medium text-foreground underline">
          {t.login.registerLink}
        </Link>
      </p>
    </div>
  );
}
