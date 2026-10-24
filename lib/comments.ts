import type { Comment, CommentNode } from "./types";

export function buildCommentTree(comments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  for (const comment of comments) map.set(comment.id, { ...comment, children: [] });

  const roots: CommentNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRec = (nodes: CommentNode[]) => {
    nodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export function countComments(nodes: CommentNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countComments(node.children), 0);
}
