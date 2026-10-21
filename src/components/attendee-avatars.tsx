import { initials } from "@/lib/format";

/** Lingkaran inisial tiga pendaftar pertama, lalu "+N" untuk sisanya. */
export function AttendeeAvatars({ names, total }: { names: string[]; total: number }) {
  if (total === 0) return null;
  const rest = total - names.length;
  return (
    <span aria-hidden className="flex -space-x-1.5">
      {names.map((name, index) => (
        <span
          key={`${name}-${index}`}
          className="inline-flex size-8 items-center justify-center rounded-full bg-secondary type-caption ring-2 ring-card"
        >
          {initials(name)}
        </span>
      ))}
      {rest > 0 && (
        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-secondary px-1.5 type-caption text-muted-foreground ring-2 ring-card">
          +{rest}
        </span>
      )}
    </span>
  );
}
