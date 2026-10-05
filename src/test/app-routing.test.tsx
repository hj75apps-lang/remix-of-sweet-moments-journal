import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

async function loadAt(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return router;
}

afterEach(() => {
  vi.restoreAllMocks();
});

// Assert only that the router mounts and paints, never page content:
// routes are rewritten as the app is built and this must keep passing.
describe("App routing", () => {
  it("renders the index route", async () => {
    const router = await loadAt("/");
    expect(router.state.status).toBe("idle");
    expect(router.state.matches.at(-1)?.routeId).toBe("/");
  });

  it("renders the not-found route", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const router = await loadAt("/this-route-does-not-exist");
    expect(router.state.status).toBe("idle");
    expect(router.state.matches.some((match) => match.status === "notFound")).toBe(true);
  });
});
