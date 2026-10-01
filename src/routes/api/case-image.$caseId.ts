import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/case-image/$caseId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^[A-Za-z0-9_-]{1,80}$/.test(params.caseId)) return new Response("Not found", { status: 404 });
        const { readImage } = await import("@/lib/lab/admin.server");
        const img = await readImage(params.caseId);
        if (!img) return new Response("Not found", { status: 404 });
        return new Response(Buffer.from(img.base64, "base64"), {
          headers: { "Content-Type": img.type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
        });
      },
    },
  },
});
