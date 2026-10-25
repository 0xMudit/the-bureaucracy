import Link from "next/link";
import { CommentForm } from "@/components/comment-form";
import { ReportButton } from "@/components/report-button";
import type { CommentNode } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function Node({
  node,
  itemId,
  authorName,
  canComment,
  canReport,
  loginHref,
  depth,
}: {
  node: CommentNode;
  itemId: string;
  authorName?: string;
  canComment: boolean;
  canReport: boolean;
  loginHref: string;
  depth: number;
}) {
  return (
    <li className={depth > 0 ? "border-l border-border/70 pl-3 sm:pl-4" : ""}>
      <article className="py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[9px] font-medium text-secondary-foreground">
            {initials(node.author) || "?"}
          </span>
          <span className="text-[12.5px] font-medium">{node.author}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
            {timeAgo(node.createdAt)}
          </span>
        </div>
        <p className="mt-1.5 whitespace-pre-wrap break-words pl-8 text-[13.5px] leading-relaxed text-foreground/90">
          {node.body}
        </p>
        <div className="ml-8 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          {depth < 4 ? (
            canComment ? (
              <details className="open:w-full">
                <summary className="cursor-pointer list-none font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground hover:text-primary">
                  Reply
                </summary>
                <div className="mt-2 border-l-2 border-border pl-3">
                  <CommentForm itemId={itemId} parentId={node.id} authorName={authorName} compact />
                </div>
              </details>
            ) : (
              <Link
                href={loginHref}
                className="inline-flex font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground hover:text-primary"
              >
                Log in to reply
              </Link>
            )
          ) : null}
          {canReport ? <ReportButton commentId={node.id} /> : null}
        </div>
      </article>
      {node.children.length ? (
        <ul className="ml-3 sm:ml-4">
          {node.children.map((child) => (
            <Node
              key={child.id}
              node={child}
              itemId={itemId}
              authorName={authorName}
              canComment={canComment}
              canReport={canReport}
              loginHref={loginHref}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CommentThread({
  nodes,
  itemId,
  authorName,
  canComment,
  canReport,
  loginHref,
}: {
  nodes: CommentNode[];
  itemId: string;
  authorName?: string;
  canComment: boolean;
  canReport: boolean;
  loginHref: string;
}) {
  if (!nodes.length) {
    return (
      <p className="border border-dashed border-border px-4 py-6 text-center text-[12.5px] text-muted-foreground">
        No comments yet. Start with the argument you would make, not the summary you would repeat.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border/60">
      {nodes.map((node) => (
        <Node
          key={node.id}
          node={node}
          itemId={itemId}
          authorName={authorName}
          canComment={canComment}
          canReport={canReport}
          loginHref={loginHref}
          depth={0}
        />
      ))}
    </ul>
  );
}
