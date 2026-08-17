import { NextResponse } from "next/server";
import { authenticatedAdmin } from "@/lib/admin-auth";
import { authenticatedCustomer } from "@/lib/account-auth";

export async function GET(request: Request) {
  const admin = await authenticatedAdmin(request);
  if (admin) {
    return NextResponse.json({ role: "ADMIN", destination: "/admin" });
  }

  const customer = await authenticatedCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  return NextResponse.json({ role: "CUSTOMER", destination: "/conta" });
}
