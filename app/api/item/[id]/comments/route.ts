import { buildCommentTree, countComments } from "@/lib/comments";
import { listComments } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/item/[id]/comments
 *
 * The open discussion polls this every few seconds while the tab is visible.
 * Realtime is deliberately scoped to the one thread a reader has open rather
 * than a websocket per page, which keeps Supabase connections bounded.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || id.length > 120) {
    return Response.json({ ok: false, error: "A story id is required." }, { status: 400 });
  }

  try {
    const comments = await listComments(id);
    const tree = buildCommentTree(comments);
    return Response.json(
      {
        ok: true,
        comments: tree,
        count: countComments(tree),
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not refresh." },
      { status: 500 },
    );
  }
}
