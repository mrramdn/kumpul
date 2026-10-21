"use client";

import "swagger-ui-dist/swagger-ui.css";
import "./api-docs.css";
import { useEffect, useRef } from "react";

/** Swagger UI dimuat hanya di browser dan hanya di halaman ini, karena ukurannya besar (sekitar 1,5 MB). */
export function ApiDocs() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    import("swagger-ui-dist/swagger-ui-bundle.js").then(({ default: SwaggerUIBundle }) => {
      if (cancelled || !container.current) return;
      SwaggerUIBundle({
        url: "/api/openapi.json",
        domNode: container.current,
        deepLinking: true,
        persistAuthorization: true,
        displayRequestDuration: true,
        defaultModelsExpandDepth: 0,
        syntaxHighlight: false,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <div id="api-docs" ref={container} className="mt-6" />;
}
