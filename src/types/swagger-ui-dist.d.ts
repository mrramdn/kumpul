// swagger-ui-dist tidak membawa tipe TypeScript. Yang dipakai hanya fungsi pembuat UI-nya.
declare module "swagger-ui-dist/swagger-ui-bundle.js" {
  const SwaggerUIBundle: (options: Record<string, unknown>) => unknown;
  export default SwaggerUIBundle;
}
