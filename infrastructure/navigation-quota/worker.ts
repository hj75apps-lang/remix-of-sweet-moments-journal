export { NavigationQuota } from "../../src/services/navigation-quota";

interface Env {
  NAVIGATION_QUOTA_STATE: {
    idFromName(name: string): unknown;
    get(id: unknown): { fetch(request: Request): Promise<Response> };
  };
}

// No public route: invoke only through the Launcher's private service binding.
export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return env.NAVIGATION_QUOTA_STATE.get(env.NAVIGATION_QUOTA_STATE.idFromName("launcher-v1")).fetch(request);
  },
};
