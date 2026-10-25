import { getSessionUser } from "@/lib/auth";
import { listNotifications, unreadNotificationCount } from "@/lib/social";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const [notifications, unread] = await Promise.all([
    listNotifications(user.id, 50),
    unreadNotificationCount(user.id),
  ]);

  return Response.json(
    { ok: true, notifications, unread },
    { headers: { "cache-control": "no-store" } },
  );
}
