import { Router, type IRouter } from "express";
import { db, eventsTable, newsTable, teamTable, galleryTable, resourcesTable, jobsTable, contactTable, studentsTable, discussionGroupsTable, groupMembersTable } from "@workspace/db";
import { count, eq, sql } from "drizzle-orm";
import { requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/admin/stats", requireAuth, async (_req, res) => {
  try {
    const [events] = await db.select({ count: count() }).from(eventsTable);
    const [news] = await db.select({ count: count() }).from(newsTable);
    const [gallery] = await db.select({ count: count() }).from(galleryTable);
    const [team] = await db.select({ count: count() }).from(teamTable);
    const [resources] = await db.select({ count: count() }).from(resourcesTable);
    const [jobs] = await db.select({ count: count() }).from(jobsTable);
    const [contacts] = await db.select({ count: count() }).from(contactTable);
    const upcomingList = await db.select().from(eventsTable).where(eq(eventsTable.isUpcoming, true));

    res.json({
      totalEvents: Number(events.count),
      totalNews: Number(news.count),
      totalGallery: Number(gallery.count),
      totalTeamMembers: Number(team.count),
      totalResources: Number(resources.count),
      totalJobs: Number(jobs.count),
      totalContacts: Number(contacts.count),
      upcomingEvents: upcomingList.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/admin/contacts", requireAuth, async (_req, res) => {
  try {
    const contacts = await db.select().from(contactTable).orderBy(contactTable.createdAt);
    res.json(contacts.reverse().map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// ── Accounts CRM ──────────────────────────────────────────────────────────────

router.get("/admin/accounts", requireAuth, async (_req, res) => {
  try {
    const students = await db
      .select({
        id: studentsTable.id,
        firstName: studentsTable.firstName,
        lastName: studentsTable.lastName,
        email: studentsTable.email,
        studentId: studentsTable.studentId,
        collegeLevel: studentsTable.collegeLevel,
        status: studentsTable.status,
        isApproved: studentsTable.isApproved,
        profilePicture: studentsTable.profilePicture,
        createdAt: studentsTable.createdAt,
        groupCount: sql<number>`(select count(*) from group_members where student_id = ${studentsTable.id})`,
      })
      .from(studentsTable)
      .orderBy(studentsTable.createdAt);

    res.json(students.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })).reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

router.patch("/admin/accounts/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!["active", "suspended", "closed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    const [updated] = await db.update(studentsTable).set({ status }).where(eq(studentsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Account not found" });
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update account" });
  }
});

router.delete("/admin/accounts/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await db.delete(studentsTable).where(eq(studentsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// ── Groups CRM ────────────────────────────────────────────────────────────────

router.get("/admin/groups-manage", requireAuth, async (_req, res) => {
  try {
    const groups = await db
      .select({
        id: discussionGroupsTable.id,
        name: discussionGroupsTable.name,
        description: discussionGroupsTable.description,
        category: discussionGroupsTable.category,
        isPrivate: discussionGroupsTable.isPrivate,
        coverColor: discussionGroupsTable.coverColor,
        coverImage: discussionGroupsTable.coverImage,
        status: discussionGroupsTable.status,
        createdBy: discussionGroupsTable.createdBy,
        createdAt: discussionGroupsTable.createdAt,
        memberCount: sql<number>`(select count(*) from group_members where group_id = ${discussionGroupsTable.id})`,
        messageCount: sql<number>`(select count(*) from group_messages where group_id = ${discussionGroupsTable.id})`,
      })
      .from(discussionGroupsTable)
      .orderBy(discussionGroupsTable.createdAt);

    res.json(groups.map(g => ({ ...g, createdAt: g.createdAt.toISOString() })).reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

router.patch("/admin/groups-manage/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!["active", "suspended", "closed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    const [updated] = await db.update(discussionGroupsTable).set({ status }).where(eq(discussionGroupsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Group not found" });
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update group" });
  }
});

router.delete("/admin/groups-manage/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await db.delete(discussionGroupsTable).where(eq(discussionGroupsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete group" });
  }
});

// ── Auto-Import ────────────────────────────────────────────────────────────────

router.get("/admin/auto-import/preview", requireAuth, async (_req, res) => {
  try {
    const { previewAutoImport } = await import("../lib/auto-import");
    const items = await previewAutoImport();
    res.json(items);
  } catch (err) {
    console.error("[auto-import preview]", err);
    res.status(500).json({ error: "Failed to fetch preview" });
  }
});

router.post("/admin/auto-import", requireAuth, async (_req, res) => {
  try {
    const { runAutoImport } = await import("../lib/auto-import");
    const result = await runAutoImport();
    res.json(result);
  } catch (err) {
    console.error("[auto-import run]", err);
    res.status(500).json({ error: "Auto-import failed" });
  }
});

// ── Download to Storage ────────────────────────────────────────────────────────

/**
 * POST /admin/resources/download-all-to-storage  (MUST be before /:id route)
 * Bulk download all internet-archive resources that don't yet have a stored file.
 * Runs sequentially to avoid hammering the network.
 */
router.post("/admin/resources/download-all-to-storage", requireAuth, async (_req, res) => {
  try {
    const { resolveArchiveFileUrl, downloadUrlToStorage } = await import("../lib/download-to-storage");

    const pending = await db
      .select()
      .from(resourcesTable)
      .where(
        sql`tags LIKE '%internet-archive%' AND stored_object_path IS NULL`
      );

    console.log(`[download-all] ${pending.length} resources need downloading`);

    let downloaded = 0;
    let failed = 0;
    const results: Array<{ id: number; title: string; status: string; objectPath?: string }> = [];

    for (const resource of pending) {
      try {
        const fileUrl = resource.fileUrl ?? "";
        let downloadUrl: string;
        let contentType: string;

        if (fileUrl.includes("archive.org/details/")) {
          const identifier = fileUrl.split("/details/")[1]?.split("?")[0];
          if (!identifier) throw new Error("Cannot parse identifier");

          const resolved = await resolveArchiveFileUrl(identifier);
          if (!resolved) throw new Error("No downloadable file found");

          downloadUrl = resolved.url;
          contentType = resolved.contentType;
        } else if (fileUrl.startsWith("http")) {
          downloadUrl = fileUrl;
          contentType = resource.type === "video" ? "video/mp4" : "application/pdf";
        } else {
          throw new Error("No valid file URL");
        }

        const result = await downloadUrlToStorage(downloadUrl, contentType);
        await db
          .update(resourcesTable)
          .set({ storedObjectPath: result.objectPath })
          .where(eq(resourcesTable.id, resource.id));

        downloaded++;
        results.push({ id: resource.id, title: resource.title, status: "ok", objectPath: result.objectPath });
        console.log(`[download-all] ✓ ${resource.id} ${resource.title}`);
      } catch (err: any) {
        failed++;
        results.push({ id: resource.id, title: resource.title, status: `error: ${err?.message}` });
        console.error(`[download-all] ✗ ${resource.id} ${resource.title}:`, err?.message);
      }
    }

    res.json({ total: pending.length, downloaded, failed, results });
  } catch (err: any) {
    console.error("[download-all]", err);
    res.status(500).json({ error: err?.message ?? "Bulk download failed" });
  }
});

/**
 * POST /admin/resources/:id/download-to-storage
 * Downloads the actual PDF/video file from Internet Archive into GCS object
 * storage and updates the resource's storedObjectPath in the DB.
 */
router.post("/admin/resources/:id/download-to-storage", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid resource id" });

  try {
    const [resource] = await db.select().from(resourcesTable).where(eq(resourcesTable.id, id));
    if (!resource) return res.status(404).json({ error: "Resource not found" });

    const { resolveArchiveFileUrl, downloadUrlToStorage } = await import("../lib/download-to-storage");

    // Resolve the actual file URL from Internet Archive metadata
    const fileUrl = resource.fileUrl ?? "";
    let downloadUrl: string;
    let contentType: string;

    if (fileUrl.includes("archive.org/details/")) {
      const identifier = fileUrl.split("/details/")[1]?.split("?")[0];
      if (!identifier) return res.status(400).json({ error: "Cannot parse Archive.org identifier" });

      const resolved = await resolveArchiveFileUrl(identifier);
      if (!resolved) return res.status(422).json({ error: `No downloadable file found for identifier: ${identifier}` });

      downloadUrl = resolved.url;
      contentType = resolved.contentType;
    } else if (fileUrl.startsWith("http")) {
      // Direct file URL — use as-is
      downloadUrl = fileUrl;
      contentType = resource.type === "video" ? "video/mp4" : "application/pdf";
    } else {
      return res.status(400).json({ error: "Resource has no valid file URL to download" });
    }

    console.log(`[download-to-storage] Starting download for resource ${id}: ${downloadUrl}`);
    const result = await downloadUrlToStorage(downloadUrl, contentType);

    // Update the resource in DB — storedObjectPath holds our GCS path
    const [updated] = await db
      .update(resourcesTable)
      .set({ storedObjectPath: result.objectPath })
      .where(eq(resourcesTable.id, id))
      .returning();

    console.log(`[download-to-storage] Resource ${id} saved → ${result.objectPath} (${result.sizeBytes} bytes)`);
    res.json({
      success: true,
      objectPath: result.objectPath,
      contentType: result.contentType,
      sizeBytes: result.sizeBytes,
      resource: { ...updated, createdAt: updated.createdAt.toISOString() },
    });
  } catch (err: any) {
    console.error(`[download-to-storage] Error for resource ${id}:`, err);
    res.status(500).json({ error: err?.message ?? "Download failed" });
  }
});


export default router;
