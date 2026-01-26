import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscription } = await request.json();

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // Upsert the subscription (update if endpoint exists, create otherwise)
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      email: session.user.email.toLowerCase(),
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    create: {
      email: session.user.email.toLowerCase(),
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint } = await request.json();

  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  // Delete the subscription
  await prisma.pushSubscription.deleteMany({
    where: {
      endpoint,
      email: session.user.email.toLowerCase(),
    },
  });

  return NextResponse.json({ success: true });
}
