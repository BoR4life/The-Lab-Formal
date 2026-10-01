import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import type { EditableCase } from "./admin.server";

const id = z.string().min(1).max(80);

export const adminGetCase = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ caseId: id }).parse(d))
  .handler(async ({ data, context }) => {
    const { getEditable } = await import("./admin.server");
    return getEditable(context.userId, data.caseId);
  });

export const adminCreateCase = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { createCase } = await import("./admin.server");
    return createCase(context.userId);
  });

export const adminSaveCase = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ c: z.custom<EditableCase>((v) => !!v && typeof v === "object") }).parse(d))
  .handler(async ({ data, context }) => {
    const { saveCase } = await import("./admin.server");
    return saveCase(context.userId, data.c);
  });

export const adminSetImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z.object({ caseId: id, contentType: z.string().max(40), base64: z.string().max(4_400_000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { setImage } = await import("./admin.server");
    return setImage(context.userId, data.caseId, data.contentType, data.base64);
  });

export const adminResults = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { results } = await import("./admin.server");
    return results(context.userId);
  });

export const adminResultsCsv = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { resultsCsv } = await import("./admin.server");
    return resultsCsv(context.userId);
  });

export const getMyHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { history } = await import("./admin.server");
    return history(context.userId);
  });
