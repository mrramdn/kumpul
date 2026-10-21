import { cardClass, pageClass } from "@/components/ui";

// Tampil sementara halaman mengambil data dari database.
export default function Loading() {
  return (
    <div className={pageClass} aria-busy>
      <div className="h-10 w-40 animate-pulse rounded-full bg-secondary" />
      <div className="mt-3 h-5 w-72 max-w-full animate-pulse rounded-full bg-secondary" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className={`${cardClass} h-56 animate-pulse`} />
        ))}
      </div>
    </div>
  );
}
