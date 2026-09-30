import { createRouter, Link } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: () => (
      <main className="wrap">
        <p className="eyebrow">Not found</p>
        <h1 className="h-page">That page isn't here.</h1>
        <p>
          <Link to="/">Go to the latest case</Link>
        </p>
      </main>
    ),
  });
}
