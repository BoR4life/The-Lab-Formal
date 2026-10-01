import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

export const getMyNotify = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { notifyState } = await import("./account.server");
    return notifyState(context.userId);
  });

/** Turning on sends a confirmation email; stays pending until they click it. */
export const setMyNotify = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ on: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { startNotify, stopNotify } = await import("./account.server");
    return data.on ? startNotify(context.userId) : stopNotify(context.userId);
  });

export const confirmNotifyToken = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ token: z.string().max(80) }).parse(d))
  .handler(async ({ data }) => {
    const { confirmNotify } = await import("./account.server");
    return confirmNotify(data.token);
  });

export const requestReset = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ email: z.string().email().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { requestPasswordReset } = await import("./account.server");
    return requestPasswordReset(data.email);
  });

export const checkReset = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ token: z.string().max(80) }).parse(d))
  .handler(async ({ data }) => {
    const { checkResetToken } = await import("./account.server");
    return checkResetToken(data.token);
  });

export const submitReset = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ token: z.string().max(80), password: z.string().max(128) }).parse(d))
  .handler(async ({ data }) => {
    const { resetPassword } = await import("./account.server");
    return resetPassword(data.token, data.password);
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
