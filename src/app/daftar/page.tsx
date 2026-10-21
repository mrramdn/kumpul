import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/redirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.register.title };
}

export default async function RegisterPage({ searchParams }: PageProps<"/daftar">) {
  const [t, user] = await Promise.all([getDictionary(), getCurrentUser()]);
  const next = safeNext((await searchParams).lanjut);
  if (user) redirect(next);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-10">
      <h1 className="type-h2">{t.register.title}</h1>
      <p className="mt-2 mb-6 type-small text-muted-foreground">{t.register.subtitle}</p>
      <AuthForm mode="register" next={next} />
      <p className="mt-6 text-center type-small text-muted-foreground">
        {t.register.hasAccount}{" "}
        <Link href={`/masuk?lanjut=${encodeURIComponent(next)}`} className="font-medium text-foreground underline">
          {t.register.loginLink}
        </Link>
      </p>
    </div>
  );
}
