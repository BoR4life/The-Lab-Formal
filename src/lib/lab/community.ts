import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

const id = z.string().min(1).max(80);

export const getComments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ caseId: id }).parse(d))
  .handler(async ({ data, context }) => {
    const { listComments } = await import("./community.server");
    return listComments(context.userId, data.caseId);
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z.object({ caseId: id, body: z.string().max(4000), parentId: id.nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { postComment } = await import("./community.server");
    return postComment(context.userId, data.caseId, data.body, data.parentId);
  });

export const reportCommentFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ commentId: id, reason: z.string().max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const { reportComment } = await import("./community.server");
    return reportComment(context.userId, data.commentId, data.reason);
  });

export const deleteCommentFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ commentId: id }).parse(d))
  .handler(async ({ data, context }) => {
    const { deleteComment } = await import("./community.server");
    return deleteComment(context.userId, data.commentId);
  });

export const hideCommentFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ commentId: id, hidden: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { setHidden } = await import("./community.server");
    return setHidden(context.userId, data.commentId, data.hidden);
  });

export const reportProblem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z.object({ caseId: id.nullable(), message: z.string().max(4000), replyEmail: z.string().max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { addProblem } = await import("./community.server");
    return addProblem(context.userId, data.caseId, data.message, data.replyEmail);
  });

export const getProblems = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { listProblems } = await import("./community.server");
    return listProblems(context.userId);
  });
