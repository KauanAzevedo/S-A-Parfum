import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const WEBHOOK_PATHS = new Set(["/api/payments/infinitepay/webhook"]);
const DEFAULT_BODY_LIMIT = 1024 * 1024;
const UPLOAD_BODY_LIMIT = 34 * 1024 * 1024;

function allowedOrigins(request: NextRequest) {
  const origins = new Set<string>([request.nextUrl.origin]);
  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredSite) {
    try {
      origins.add(new URL(configuredSite).origin);
    } catch {
      // A URL inválida não deve liberar origens adicionais.
    }
  }
  return origins;
}

export function proxy(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  const bodyLimit = request.nextUrl.pathname === "/api/admin/product-image" ? UPLOAD_BODY_LIMIT : DEFAULT_BODY_LIMIT;
  if (Number.isFinite(contentLength) && contentLength > bodyLimit) {
    return NextResponse.json(
      { error: "Requisição maior que o limite permitido." },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (SAFE_METHODS.has(request.method) || WEBHOOK_PATHS.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins(request).has(origin)) {
    return NextResponse.json(
      { error: "Origem da requisição não autorizada." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
