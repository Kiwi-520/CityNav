import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = String(searchParams.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ message: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  return NextResponse.json({
    exists: Boolean(user),
    hasPassword: Boolean(user?.passwordHash),
  });
}
