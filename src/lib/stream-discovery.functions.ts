import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { discoverWebsite } from "@/services/stream-discovery";
export type { DiscoveredStation } from "@/services/stream-discovery";

import { requestDiscovery } from "@/services/stream-discovery-request";

export const discoverStream = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ url: z.string().trim().min(4).max(300) }).parse(d))
  .handler(({ data }) => discoverWebsite(data.url, requestDiscovery));
