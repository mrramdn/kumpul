// Class Tailwind yang dipakai berulang, mengikuti resep komponen Raster.

const buttonBase =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full transition-colors disabled:pointer-events-none disabled:opacity-40";

const buttonSizes = {
  large: "h-12 px-7 text-base font-medium",
  small: "h-9 px-4 type-ui",
  /** Untuk tombol di dalam baris daftar, misalnya konfirmasi hapus peserta. */
  compact: "h-8 px-3 type-ui",
};

const buttonVariants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary: "bg-secondary text-secondary-foreground hover:bg-input/60",
  ghost: "text-foreground hover:bg-accent",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/85",
};

export function buttonClass(
  variant: keyof typeof buttonVariants,
  size: keyof typeof buttonSizes = "large",
  extra = "",
) {
  return `${buttonBase} ${buttonSizes[size]} ${buttonVariants[variant]} ${extra}`.trim();
}

export const iconButtonClass =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

export const cardClass = "rounded-2xl border border-border bg-card";

export const inputClass =
  "mt-2 h-12 w-full rounded-full border bg-card px-5 text-base placeholder:text-muted-foreground disabled:opacity-40";

export const textareaClass =
  "mt-2 min-h-32 w-full rounded-lg border bg-card px-5 py-3 text-base placeholder:text-muted-foreground disabled:opacity-40";

/**
 * Lebar konten: hampir selebar layar dengan jarak tepi 16px (HP), 24px (tablet), dan 40px (desktop),
 * dibatasi 1600px supaya tidak terlalu melebar di monitor ultra-wide. Header dan footer memakai nilai yang sama.
 */
export const gutterClass = "mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10";

export const pageClass = `py-8 sm:py-10 ${gutterClass}`;

/** Untuk kartu tunggal di tengah (404, error), supaya tidak membentang. */
export const narrowPageClass = "mx-auto w-full max-w-2xl px-4 py-8 sm:py-10";
