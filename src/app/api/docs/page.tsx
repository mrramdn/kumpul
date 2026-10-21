import { Download, Lock } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getDictionary, getLang, type Dictionary } from "@/i18n";
import { format } from "@/i18n/format";
import { ApiTry, type TryParam } from "@/components/api-try";
import { buttonClass, cardClass, pageClass } from "@/components/ui";
import { listEvents } from "@/lib/events";
import { buildOpenApi } from "@/lib/openapi";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.docs.title };
}

// Halaman ini dirender dari spesifikasi yang sama dengan /api/openapi.json (src/lib/openapi.ts),
// jadi dokumentasi dan file spesifikasinya tidak bisa berbeda isi.

type Schema = {
  type?: string | string[];
  format?: string;
  enum?: string[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  default?: unknown;
  description?: string;
  $ref?: string;
  properties?: Record<string, Schema>;
  required?: string[];
};
type Parameter = { name: string; in: "path" | "query"; required?: boolean; description?: string; schema: Schema };
type Content = { "application/json"?: { schema?: Schema; example?: unknown } };
type Operation = {
  tags: string[];
  summary: string;
  description?: string;
  security?: unknown[];
  parameters?: Parameter[];
  requestBody?: { content: Content };
  responses: Record<string, { description: string; content?: Content }>;
};
type Spec = {
  info: { description: string };
  tags: { name: string; description: string }[];
  paths: Record<string, { parameters?: Parameter[] } & Partial<Record<Method, Operation>>>;
  components: { schemas: Record<string, Schema> };
};
type Method = "get" | "post" | "put" | "delete";

const METHODS: Method[] = ["get", "post", "put", "delete"];

function anchor(method: string, path: string) {
  return `${method}-${path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`;
}

/** `kode` dan **tebal** dari teks deskripsi spesifikasi. */
function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("`")) {
      return (
        <code key={index} className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

function typeLabel(schema: Schema) {
  const types = Array.isArray(schema.type) ? schema.type.join(" | ") : (schema.type ?? "");
  return schema.format ? `${types} (${schema.format})` : types;
}

function constraints(schema: Schema, t: Dictionary) {
  const notes: string[] = [];
  const min = schema.minLength ?? schema.minimum;
  const max = schema.maxLength ?? schema.maximum;
  if (min !== undefined) notes.push(format(t.docs.min, { value: min }));
  if (max !== undefined) notes.push(format(t.docs.max, { value: max }));
  if (schema.default !== undefined) notes.push(format(t.docs.defaultValue, { value: JSON.stringify(schema.default) }));
  if (schema.enum) notes.push(schema.enum.join(" · "));
  return notes.join(", ");
}

function statusDot(code: string) {
  if (code.startsWith("2")) return "bg-success";
  if (code.startsWith("5")) return "bg-destructive";
  return "bg-warning";
}

function MethodPill({ method }: { method: string }) {
  return (
    <span
      className={`inline-flex h-7 min-w-16 items-center justify-center rounded-full bg-secondary px-3 font-mono text-xs font-semibold ${
        method === "delete" ? "text-destructive" : ""
      }`}
    >
      {method.toUpperCase()}
    </span>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <h4 className="mb-2 type-ui">{title}</h4>
      {children}
    </div>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">{children}</div>;
}

function Example({ label, value }: { label: string; value: unknown }) {
  return (
    <details className="group mt-2">
      <summary className="cursor-pointer type-small text-muted-foreground hover:text-foreground">{label}</summary>
      <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-muted px-4 py-3 font-mono text-[13px] leading-5">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

function OperationCard({
  method,
  path,
  operation,
  parameters,
  spec,
  t,
  sampleEventId,
}: {
  method: Method;
  path: string;
  operation: Operation;
  parameters: Parameter[];
  spec: Spec;
  t: Dictionary;
  sampleEventId: string;
}) {
  const body = operation.requestBody?.content["application/json"];
  const bodySchema = body?.schema?.$ref ? spec.components.schemas[body.schema.$ref.split("/").pop()!] : body?.schema;
  const tryParams: TryParam[] = parameters.map((parameter) => ({
    name: parameter.name,
    in: parameter.in,
    options: parameter.schema.enum,
    value: parameter.name === "id" ? sampleEventId : String(parameter.schema.default ?? ""),
  }));

  return (
    <article id={anchor(method, path)} className={`${cardClass} scroll-mt-24 p-6 sm:p-7`}>
      <div className="flex flex-wrap items-center gap-3">
        <MethodPill method={method} />
        <code className="font-mono text-[15px] font-semibold break-all">{path}</code>
        {operation.security && (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-secondary px-3 type-caption">
            <Lock aria-hidden className="size-3.5" />
            {t.docs.requiresLogin}
          </span>
        )}
      </div>
      <h3 className="mt-4 type-title">{operation.summary}</h3>
      {operation.description && (
        <p className="mt-1 type-small text-muted-foreground">{inline(operation.description)}</p>
      )}

      {parameters.length > 0 && (
        <Block title={t.docs.parameters}>
          <Rows>
            {parameters.map((parameter) => (
              <div
                key={parameter.name}
                className="grid gap-1 px-4 py-3 type-small sm:grid-cols-[10rem_10rem_minmax(0,1fr)] sm:gap-4"
              >
                <span className="font-mono font-medium">{parameter.name}</span>
                <span className="text-muted-foreground">
                  {parameter.in} · {parameter.required ? t.docs.required : t.docs.optional}
                </span>
                <span>
                  {parameter.description}
                  {constraints(parameter.schema, t) && (
                    <span className="block text-muted-foreground">{constraints(parameter.schema, t)}</span>
                  )}
                </span>
              </div>
            ))}
          </Rows>
        </Block>
      )}

      {bodySchema?.properties && (
        <Block title={t.docs.requestBody}>
          <Rows>
            {Object.entries(bodySchema.properties).map(([name, schema]) => (
              <div
                key={name}
                className="grid gap-1 px-4 py-3 type-small sm:grid-cols-[10rem_10rem_minmax(0,1fr)] sm:gap-4"
              >
                <span className="font-mono font-medium">{name}</span>
                <span className="text-muted-foreground">
                  {typeLabel(schema)} · {bodySchema.required?.includes(name) ? t.docs.required : t.docs.optional}
                </span>
                <span>
                  {schema.description && inline(schema.description)}
                  {constraints(schema, t) && (
                    <span className="block text-muted-foreground">{constraints(schema, t)}</span>
                  )}
                </span>
              </div>
            ))}
          </Rows>
          {body?.example !== undefined && <Example label={t.docs.example} value={body.example} />}
        </Block>
      )}

      <Block title={t.docs.responses}>
        <Rows>
          {Object.entries(operation.responses).map(([code, response]) => {
            const example = response.content?.["application/json"]?.example;
            return (
              <div key={code} className="px-4 py-3 type-small">
                <div className="flex items-baseline gap-3">
                  <span className="inline-flex w-14 shrink-0 items-center gap-1.5 font-mono font-semibold">
                    <span aria-hidden className={`size-1.5 rounded-full ${statusDot(code)}`} />
                    {code}
                  </span>
                  <span>{inline(response.description)}</span>
                </div>
                {example !== undefined && (
                  <div className="pl-[4.25rem]">
                    <Example label={t.docs.example} value={example} />
                  </div>
                )}
              </div>
            );
          })}
        </Rows>
      </Block>

      <details className="mt-6 rounded-lg border border-border">
        <summary className="cursor-pointer px-4 py-3 type-ui hover:bg-accent">{t.docs.tryIt}</summary>
        <div className="border-t border-border p-4">
          <ApiTry
            method={method.toUpperCase()}
            path={path}
            params={tryParams}
            body={body ? JSON.stringify(body.example ?? {}, null, 2) : undefined}
          />
        </div>
      </details>
    </article>
  );
}

export default async function ApiDocsPage() {
  const [t, lang] = await Promise.all([getDictionary(), getLang()]);
  const spec = buildOpenApi(lang) as unknown as Spec;
  // Untuk tombol Coba: id acara yang benar-benar ada, supaya contoh langsung berhasil.
  const sampleEventId = await listEvents("upcoming")
    .then((events) => events[0]?.id ?? "")
    .catch(() => "");

  const groups = spec.tags.map((tag) => ({
    ...tag,
    operations: Object.entries(spec.paths).flatMap(([path, item]) =>
      METHODS.filter((method) => item[method]?.tags.includes(tag.name)).map((method) => ({
        method,
        path,
        operation: item[method]!,
        parameters: [...(item.parameters ?? []), ...(item[method]!.parameters ?? [])],
      })),
    ),
  }));

  return (
    <div className={pageClass}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-h1">{t.docs.title}</h1>
          <p className="mt-1 max-w-3xl type-small text-muted-foreground">{t.docs.subtitle}</p>
        </div>
        <a
          href={`/api/openapi.json?lang=${lang}`}
          download="kumpul-openapi.json"
          className={buttonClass("secondary", "small")}
        >
          <Download aria-hidden className="size-4" />
          {t.docs.download}
        </a>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label={t.docs.contents} className="hidden xl:block">
          <div className="sticky top-24 space-y-6">
            {groups.map((group) => (
              <div key={group.name}>
                <p className="mb-2 type-ui">{group.name}</p>
                <ul className="space-y-1">
                  {group.operations.map(({ method, path }) => (
                    <li key={`${method} ${path}`}>
                      <a
                        href={`#${anchor(method, path)}`}
                        className="flex gap-2 rounded-full py-0.5 type-small text-muted-foreground hover:text-foreground"
                      >
                        <span className="w-12 shrink-0 font-mono text-[11px] leading-5 font-semibold">
                          {method.toUpperCase()}
                        </span>
                        <span className="truncate font-mono text-xs leading-5">{path.replace("/api", "")}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0 space-y-10">
          <section className={`${cardClass} p-6 sm:p-7`}>
            <h2 className="type-title">{t.docs.conventions}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 type-small">
              {spec.info.description.split("\n").map((line) => (
                <li key={line}>{inline(line.replace(/^- /, ""))}</li>
              ))}
            </ul>
          </section>

          {groups.map((group) => (
            <section key={group.name} className="space-y-4">
              <div>
                <h2 className="type-h3">{group.name}</h2>
                <p className="mt-1 type-small text-muted-foreground">{group.description}</p>
              </div>
              {group.operations.map(({ method, path, operation, parameters }) => (
                <OperationCard
                  key={`${method} ${path}`}
                  method={method}
                  path={path}
                  operation={operation}
                  parameters={parameters}
                  spec={spec}
                  t={t}
                  sampleEventId={sampleEventId}
                />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
