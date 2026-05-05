const COMMENT_STORAGE_KEY = "etc_store_product_comments";

function normalizeComment(comment, index = 0) {
  return {
    id: String(comment?.id || `comment-${Date.now()}-${index}`),
    productId: String(comment?.productId || ""),
    userName: String(comment?.userName || "User ETC"),
    userEmail: String(comment?.userEmail || ""),
    message: String(comment?.message || "").trim(),
    createdAt: String(comment?.createdAt || new Date().toISOString()),
  };
}

function getComments() {
  try {
    const raw = localStorage.getItem(COMMENT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((comment, index) => normalizeComment(comment, index))
      .filter((comment) => comment.productId && comment.message);
  } catch {
    return [];
  }
}

function saveComments(comments) {
  const normalizedComments = comments
    .map((comment, index) => normalizeComment(comment, index))
    .filter((comment) => comment.productId && comment.message);

  localStorage.setItem(COMMENT_STORAGE_KEY, JSON.stringify(normalizedComments));
  return normalizedComments;
}

function addComment(commentInput) {
  const nextComments = [...getComments(), normalizeComment(commentInput)];
  return saveComments(nextComments);
}

function removeComment(commentId) {
  const nextComments = getComments().filter((comment) => comment.id !== commentId);
  return saveComments(nextComments);
}

const CommentStore = {
  getComments,
  saveComments,
  addComment,
  removeComment,
};

export default CommentStore;
