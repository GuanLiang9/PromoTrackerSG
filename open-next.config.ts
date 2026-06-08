import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// All pages are `force-dynamic`, so no incremental/ISR cache backend is needed.
export default defineCloudflareConfig();
