import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

export const getMyNotify = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getNotify } = await import("./notify.server");
    return getNotify(context.userId);
  });

export const setMyNotify = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ on: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { setNotify } = await import("./notify.server");
    return setNotify(context.userId, data.on);
  });

/** Public: the token in an email's unsubscribe link. */
export const unsubscribeWithToken = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ token: z.string().max(80) }).parse(d))
  .handler(async ({ data }) => {
    const { unsubscribe } = await import("./notify.server");
    return unsubscribe(data.token);
  });

export const getNotifyInfo = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { notifyInfo } = await import("./notify.server");
    return notifyInfo(context.userId);
  });

export const sendNewCaseEmailFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ origin: z.string().max(200), again: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { sendNewCaseEmail } = await import("./notify.server");
    return sendNewCaseEmail(context.userId, data.origin, data.again);
  });
