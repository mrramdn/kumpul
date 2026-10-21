import Link from "next/link";
import { getDictionary } from "@/i18n";
import { buttonClass, cardClass, narrowPageClass } from "@/components/ui";

export default async function NotFound() {
  const t = await getDictionary();
  return (
    <div className={narrowPageClass}>
      <div className={`${cardClass} flex flex-col items-center px-6 py-14 text-center`}>
        <p className="type-caption text-muted-foreground">404</p>
        <h1 className="mt-2 type-h2">{t.notFound.title}</h1>
        <p className="mt-2 type-small text-muted-foreground">{t.notFound.text}</p>
        <Link href="/" className={buttonClass("secondary", "small", "mt-6")}>
          {t.notFound.back}
        </Link>
      </div>
    </div>
  );
}
