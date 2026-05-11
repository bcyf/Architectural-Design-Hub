import app from "./app";
import { db, resourcesTable } from "@workspace/db";
import { like, count } from "drizzle-orm";
import { seedSoftwareTools } from "./lib/seed-software";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  seedSoftwareTools();
  scheduleAutoImport();
});

async function scheduleAutoImport() {
  try {
    const [{ total }] = await db
      .select({ total: count() })
      .from(resourcesTable)
      .where(like(resourcesTable.tags, "%internet-archive%"));

    if (Number(total) < 10) {
      console.log(`[auto-import] Only ${total} imported resources found — running auto-import…`);
      const { runAutoImport } = await import("./lib/auto-import");
      const result = await runAutoImport();
      console.log(`[auto-import] Done: ${result.imported} imported, ${result.skipped} skipped, ${result.errors} errors`);
    } else {
      console.log(`[auto-import] ${total} resources already in library — skipping startup import`);
    }
  } catch (err) {
    console.error("[auto-import] Startup import error:", err);
  }
}
