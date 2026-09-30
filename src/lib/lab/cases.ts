import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

const caseIdInput = z.object({ caseId: z.string().min(1).max(80) });
const answersInput = z.object({ caseId: z.string().min(1).max(80), answers: z.unknown() });

/** Public: the newest open case, without any answer content. */
export const getCurrentCase = createServerFn({ method: "GET" }).handler(async () => {
  const { currentOpenCase } = await import("./cases.server");
  return currentOpenCase();
});

/** Public: all published cases, newest first. */
export const getOpenCases = createServerFn({ method: "GET" }).handler(async () => {
  const { openCaseList } = await import("./cases.server");
  return openCaseList();
});

/** Public: one case's learner-facing fields. Drafts return null. */
export const getPublicCase = createServerFn({ method: "GET" })
  .validator((d: unknown) => caseIdInput.parse(d))
  .handler(async ({ data }) => {
    const { publicCase } = await import("./cases.server");
    return publicCase(data.caseId);
  });

export const getAdminCase = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: unknown) => caseIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { adminCase } = await import("./cases.server");
    return adminCase(context.userId, data.caseId);
  });

export const getAdminCaseList = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { adminCaseList } = await import("./cases.server");
    return adminCaseList(context.userId);
  });

export const getMyAttempt = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: unknown) => caseIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { myAttempt } = await import("./cases.server");
    return myAttempt(context.userId, data.caseId);
  });

export const saveMyProgress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => answersInput.parse(d))
  .handler(async ({ data, context }) => {
    const { saveProgress } = await import("./cases.server");
    return saveProgress(context.userId, data.caseId, data.answers);
  });

export const submitMyRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => answersInput.parse(d))
  .handler(async ({ data, context }) => {
    const { submitRead } = await import("./cases.server");
    return submitRead(context.userId, data.caseId, data.answers);
  });

export const resetMyPreview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => caseIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { resetMyAttempt } = await import("./cases.server");
    return resetMyAttempt(context.userId, data.caseId);
  });

export const getMyStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { myStats } = await import("./cases.server");
    return myStats(context.userId);
  });
