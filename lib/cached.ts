import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getItem, listComments, listItems } from "./store";

/**
 * Cross-request data cache for the wire. The feed changes on a 15-minute
 * ingest cycle, so a 45-second window is invisible to readers but removes a
 * database round trip from almost every navigation.
 */
export const cachedItems = unstable_cache(() => listItems(), ["items:list"], {
  tags: ["items"],
  revalidate: 45,
});

export const cachedItem = cache(
  unstable_cache((id: string) => getItem(id), ["items:by-id"], {
    tags: ["items"],
    revalidate: 45,
  }),
);

export const cachedComments = unstable_cache((itemId: string) => listComments(itemId), ["comments:by-item"], {
  tags: ["comments"],
  revalidate: 30,
});
