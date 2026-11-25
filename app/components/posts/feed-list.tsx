"use client";

import { useSyncExternalStore } from "react";
import { PostCard } from "@/app/components/posts/post-card";
import { feedPosts, type FeedPost } from "@/app/lib/mock-feed";
import {
  getStoredPosts,
  subscribeToPosts,
  toFeedPost,
  type StoredPost,
} from "@/app/lib/post-storage";

// Stable server snapshot: the server never knows about localStorage, and
// useSyncExternalStore requires the same reference on every call.
const EMPTY_STORED_POSTS: StoredPost[] = [];

// Saved posts (newest first) render above the mock feed; posts whose kid no
// longer exists are dropped by toFeedPost.
export function FeedList() {
  const storedPosts = useSyncExternalStore(
    subscribeToPosts,
    getStoredPosts,
    () => EMPTY_STORED_POSTS,
  );

  const posts: FeedPost[] = [
    ...storedPosts
      .map(toFeedPost)
      .filter((post): post is FeedPost => post !== null),
    ...feedPosts,
  ];

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
