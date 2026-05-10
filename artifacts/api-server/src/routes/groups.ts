import { Router, type IRouter, type Request, type Response } from "express";
import { db, discussionGroupsTable, groupMembersTable, groupMessagesTable, groupMessageReactionsTable, groupTasksTable, groupTaskSubmissionsTable, groupRulesTable, studentsTable } from "@workspace/db";
import { eq, and, desc, inArray, asc } from "drizzle-orm";
import { requireStudentAuth } from "./students";

const router: IRouter = Router();

// ── helpers ──────────────────────────────────────────────────────────────────

async function isMember(groupId: number, studentId: number) {
  const [row] = await db.select().from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.studentId, studentId)));
  return row ?? null;
}

// ── Groups CRUD ───────────────────────────────────────────────────────────────

router.get("/groups", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  try {
    const myMemberships = await db.select({ groupId: groupMembersTable.groupId })
      .from(groupMembersTable).where(eq(groupMembersTable.studentId, me.id));
    const myGroupIds = myMemberships.map(m => m.groupId);

    const allGroups = await db.select({
      id: discussionGroupsTable.id, name: discussionGroupsTable.name, description: discussionGroupsTable.description,
      category: discussionGroupsTable.category, isPrivate: discussionGroupsTable.isPrivate,
      coverColor: discussionGroupsTable.coverColor, coverImage: discussionGroupsTable.coverImage,
      status: discussionGroupsTable.status, createdBy: discussionGroupsTable.createdBy, createdAt: discussionGroupsTable.createdAt,
    }).from(discussionGroupsTable).orderBy(desc(discussionGroupsTable.createdAt));

    const memberCounts = await db.select({ groupId: groupMembersTable.groupId }).from(groupMembersTable);
    const countMap: Record<number, number> = {};
    memberCounts.forEach(m => { countMap[m.groupId] = (countMap[m.groupId] || 0) + 1; });

    const groups = allGroups
      .filter(g => !g.isPrivate || myGroupIds.includes(g.id))
      .map(g => ({ ...g, memberCount: countMap[g.id] || 0, isMember: myGroupIds.includes(g.id) }));

    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

router.patch("/groups/:id", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const { name, description, coverColor, coverImage, status } = req.body;

  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "Members only" });
    if (!["leader", "co-leader"].includes(membership.role)) {
      return res.status(403).json({ error: "Only leaders can update group details" });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (coverColor !== undefined) updates.coverColor = coverColor;
    if (coverImage !== undefined) updates.coverImage = coverImage || null;
    if (status === "closed") updates.status = "closed";

    const [updated] = await db.update(discussionGroupsTable)
      .set(updates)
      .where(eq(discussionGroupsTable.id, groupId))
      .returning();

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update group" });
  }
});

router.delete("/groups/:id", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "Members only" });
    if (membership.role !== "leader") return res.status(403).json({ error: "Only the group leader can delete the group" });
    await db.delete(discussionGroupsTable).where(eq(discussionGroupsTable.id, groupId));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete group" });
  }
});

router.post("/groups", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const { name, description, category, isPrivate, coverColor, coverImage } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Group name is required" });

  try {
    const [group] = await db.insert(discussionGroupsTable)
      .values({ name: name.trim(), description: description?.trim(), category: category || "general", isPrivate: !!isPrivate, coverColor: coverColor || "#16a34a", coverImage: coverImage || null, createdBy: me.id })
      .returning();

    await db.insert(groupMembersTable).values({ groupId: group.id, studentId: me.id, role: "leader" });

    const invitedMembers: Array<{ studentId: number; role: string }> = req.body.invitedMembers || [];
    const validRoles = ["leader", "co-leader", "designer", "researcher", "reviewer", "member"];
    for (const inv of invitedMembers) {
      if (!inv.studentId || inv.studentId === me.id) continue;
      await db.insert(groupMembersTable).values({ groupId: group.id, studentId: inv.studentId, role: validRoles.includes(inv.role) ? inv.role : "member" }).onConflictDoNothing();
    }
    const totalMembers = 1 + invitedMembers.filter(i => i.studentId !== me.id).length;
    res.status(201).json({ ...group, memberCount: totalMembers, isMember: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create group" });
  }
});

router.get("/groups/:id", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);

  try {
    const [group] = await db.select().from(discussionGroupsTable).where(eq(discussionGroupsTable.id, groupId));
    if (!group) return res.status(404).json({ error: "Group not found" });

    const membership = await isMember(groupId, me.id);
    if (group.isPrivate && !membership) return res.status(403).json({ error: "This is a private group" });

    const members = await db.select({
      id: groupMembersTable.id, studentId: groupMembersTable.studentId, role: groupMembersTable.role,
      joinedAt: groupMembersTable.joinedAt, firstName: studentsTable.firstName, lastName: studentsTable.lastName,
      email: studentsTable.email, studentIdCode: studentsTable.studentId, profilePicture: studentsTable.profilePicture,
    }).from(groupMembersTable)
      .innerJoin(studentsTable, eq(groupMembersTable.studentId, studentsTable.id))
      .where(eq(groupMembersTable.groupId, groupId));

    res.json({ ...group, members, myRole: membership?.role ?? null, isMember: !!membership });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch group" });
  }
});

router.post("/groups/:id/join", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const { role } = req.body;

  try {
    const [group] = await db.select().from(discussionGroupsTable).where(eq(discussionGroupsTable.id, groupId));
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.isPrivate) return res.status(403).json({ error: "Cannot join a private group without an invite" });

    const existing = await isMember(groupId, me.id);
    if (existing) return res.status(409).json({ error: "Already a member" });

    const validRoles = ["leader", "co-leader", "designer", "researcher", "reviewer", "member"];
    await db.insert(groupMembersTable).values({ groupId, studentId: me.id, role: validRoles.includes(role) ? role : "member" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to join group" });
  }
});

router.post("/groups/:id/invite", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const { studentId, role } = req.body;
  if (!studentId) return res.status(400).json({ error: "studentId is required" });

  try {
    const [group] = await db.select().from(discussionGroupsTable).where(eq(discussionGroupsTable.id, groupId));
    if (!group) return res.status(404).json({ error: "Group not found" });

    const myMembership = await isMember(groupId, me.id);
    if (!myMembership) return res.status(403).json({ error: "You must be a member to invite others" });

    const existing = await isMember(groupId, Number(studentId));
    if (existing) return res.status(409).json({ error: "This student is already a member" });

    const validRoles = ["leader", "co-leader", "designer", "researcher", "reviewer", "member"];
    await db.insert(groupMembersTable).values({ groupId, studentId: Number(studentId), role: validRoles.includes(role) ? role : "member" });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to invite member" });
  }
});

router.post("/groups/:id/leave", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  try {
    await db.delete(groupMembersTable).where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.studentId, me.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to leave group" });
  }
});

router.patch("/groups/:id/members/:memberId/role", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const memberId = Number(req.params.memberId);
  const { role } = req.body;

  try {
    const [member] = await db.select().from(groupMembersTable).where(eq(groupMembersTable.id, memberId));
    if (!member || member.groupId !== groupId) return res.status(404).json({ error: "Member not found" });
    if (member.studentId !== me.id) return res.status(403).json({ error: "You can only change your own role" });

    const validRoles = ["leader", "co-leader", "designer", "researcher", "reviewer", "member"];
    if (!validRoles.includes(role)) return res.status(400).json({ error: "Invalid role" });

    const [updated] = await db.update(groupMembersTable).set({ role }).where(eq(groupMembersTable.id, memberId)).returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update role" });
  }
});

// ── Messages ──────────────────────────────────────────────────────────────────

router.get("/groups/:id/messages", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  try {
    const [group] = await db.select().from(discussionGroupsTable).where(eq(discussionGroupsTable.id, groupId));
    if (!group) return res.status(404).json({ error: "Group not found" });
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "You must be a member to view messages" });

    const messages = await db.select({
      id: groupMessagesTable.id,
      content: groupMessagesTable.content,
      attachmentName: groupMessagesTable.attachmentName,
      attachmentPath: groupMessagesTable.attachmentPath,
      attachmentType: groupMessagesTable.attachmentType,
      replyToId: groupMessagesTable.replyToId,
      createdAt: groupMessagesTable.createdAt,
      studentId: groupMessagesTable.studentId,
      firstName: studentsTable.firstName,
      lastName: studentsTable.lastName,
    }).from(groupMessagesTable)
      .innerJoin(studentsTable, eq(groupMessagesTable.studentId, studentsTable.id))
      .where(eq(groupMessagesTable.groupId, groupId))
      .orderBy(groupMessagesTable.createdAt);

    const msgIds = messages.map(m => m.id);

    // Fetch reactions
    let reactionsData: { messageId: number; emoji: string; studentId: number }[] = [];
    if (msgIds.length > 0) {
      reactionsData = await db.select({
        messageId: groupMessageReactionsTable.messageId,
        emoji: groupMessageReactionsTable.emoji,
        studentId: groupMessageReactionsTable.studentId,
      }).from(groupMessageReactionsTable)
        .where(inArray(groupMessageReactionsTable.messageId, msgIds));
    }

    // Fetch reply-to parent messages
    const replyToIds = [...new Set(messages.filter(m => m.replyToId).map(m => m.replyToId!))] ;
    const replyParents: Record<number, any> = {};
    if (replyToIds.length > 0) {
      const parents = await db.select({
        id: groupMessagesTable.id,
        content: groupMessagesTable.content,
        attachmentName: groupMessagesTable.attachmentName,
        attachmentType: groupMessagesTable.attachmentType,
        firstName: studentsTable.firstName,
        lastName: studentsTable.lastName,
      }).from(groupMessagesTable)
        .innerJoin(studentsTable, eq(groupMessagesTable.studentId, studentsTable.id))
        .where(inArray(groupMessagesTable.id, replyToIds));
      parents.forEach(p => { replyParents[p.id] = p; });
    }

    // Build reaction map: messageId → [{emoji, count, reacted}]
    const reactionMap: Record<number, { emoji: string; count: number; reacted: boolean }[]> = {};
    for (const r of reactionsData) {
      if (!reactionMap[r.messageId]) reactionMap[r.messageId] = [];
      const existing = reactionMap[r.messageId].find(x => x.emoji === r.emoji);
      if (existing) {
        existing.count++;
        if (r.studentId === me.id) existing.reacted = true;
      } else {
        reactionMap[r.messageId].push({ emoji: r.emoji, count: 1, reacted: r.studentId === me.id });
      }
    }

    const result = messages.map(m => ({
      ...m,
      replyTo: m.replyToId ? (replyParents[m.replyToId] ?? null) : null,
      reactions: reactionMap[m.id] || [],
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/groups/:id/messages", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const { content, attachmentName, attachmentPath, attachmentType, replyToId } = req.body;

  const hasText = !!content?.trim();
  const hasAttachment = !!attachmentPath && !!attachmentName;
  if (!hasText && !hasAttachment) {
    return res.status(400).json({ error: "Message must have text or an attachment" });
  }

  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "You must be a member to post" });

    const [msg] = await db.insert(groupMessagesTable)
      .values({
        groupId,
        studentId: me.id,
        content: hasText ? content.trim() : null,
        attachmentName: hasAttachment ? attachmentName : null,
        attachmentPath: hasAttachment ? attachmentPath : null,
        attachmentType: hasAttachment ? (attachmentType || "document") : null,
        replyToId: replyToId ? Number(replyToId) : null,
      })
      .returning();

    res.status(201).json({ ...msg, firstName: me.firstName, lastName: me.lastName, replyTo: null, reactions: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ── Reactions ─────────────────────────────────────────────────────────────────

router.post("/groups/:id/messages/:msgId/reactions", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const msgId = Number(req.params.msgId);
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: "emoji is required" });

  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "Members only" });

    const [existing] = await db.select().from(groupMessageReactionsTable)
      .where(and(
        eq(groupMessageReactionsTable.messageId, msgId),
        eq(groupMessageReactionsTable.studentId, me.id),
        eq(groupMessageReactionsTable.emoji, emoji),
      ));

    if (existing) {
      await db.delete(groupMessageReactionsTable).where(eq(groupMessageReactionsTable.id, existing.id));
      res.json({ action: "removed" });
    } else {
      await db.insert(groupMessageReactionsTable).values({ messageId: msgId, studentId: me.id, emoji });
      res.json({ action: "added" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle reaction" });
  }
});

// ── Tasks ─────────────────────────────────────────────────────────────────────

router.get("/groups/:id/tasks", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);

  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "Members only" });

    const tasks = await db.select({
      id: groupTasksTable.id, title: groupTasksTable.title, description: groupTasksTable.description,
      status: groupTasksTable.status, priority: groupTasksTable.priority, dueDate: groupTasksTable.dueDate,
      createdAt: groupTasksTable.createdAt, updatedAt: groupTasksTable.updatedAt,
      assignedTo: groupTasksTable.assignedTo, createdBy: groupTasksTable.createdBy,
      assigneeName: studentsTable.firstName, assigneeLastName: studentsTable.lastName,
    }).from(groupTasksTable)
      .leftJoin(studentsTable, eq(groupTasksTable.assignedTo, studentsTable.id))
      .where(eq(groupTasksTable.groupId, groupId))
      .orderBy(groupTasksTable.createdAt);

    const taskIds = tasks.map(t => t.id);
    let subCounts: Record<number, number> = {};
    if (taskIds.length > 0) {
      const subs = await db.select({ taskId: groupTaskSubmissionsTable.taskId })
        .from(groupTaskSubmissionsTable)
        .where(inArray(groupTaskSubmissionsTable.taskId, taskIds));
      subs.forEach(s => { subCounts[s.taskId] = (subCounts[s.taskId] || 0) + 1; });
    }

    res.json(tasks.map(t => ({ ...t, submissionCount: subCounts[t.id] || 0 })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.post("/groups/:id/tasks", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const { title, description, assignedTo, status, priority, dueDate } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Task title is required" });

  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "Members only" });

    const [task] = await db.insert(groupTasksTable)
      .values({ groupId, title: title.trim(), description: description?.trim(), assignedTo: assignedTo || null, status: status || "todo", priority: priority || "medium", dueDate: dueDate || null, createdBy: me.id })
      .returning();

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.patch("/groups/:id/tasks/:taskId", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const taskId = Number(req.params.taskId);

  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "Members only" });

    const { title, description, assignedTo, status, priority, dueDate } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo || null;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate || null;

    const [task] = await db.update(groupTasksTable).set(updates)
      .where(and(eq(groupTasksTable.id, taskId), eq(groupTasksTable.groupId, groupId)))
      .returning();

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

router.delete("/groups/:id/tasks/:taskId", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const taskId = Number(req.params.taskId);

  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "Members only" });

    await db.delete(groupTasksTable).where(and(eq(groupTasksTable.id, taskId), eq(groupTasksTable.groupId, groupId)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// ── Task Submissions ───────────────────────────────────────────────────────────

router.get("/groups/:id/tasks/:taskId/submissions", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const taskId = Number(req.params.taskId);

  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "Members only" });

    const submissions = await db.select({
      id: groupTaskSubmissionsTable.id,
      taskId: groupTaskSubmissionsTable.taskId,
      studentId: groupTaskSubmissionsTable.studentId,
      fileName: groupTaskSubmissionsTable.fileName,
      objectPath: groupTaskSubmissionsTable.objectPath,
      note: groupTaskSubmissionsTable.note,
      isApproved: groupTaskSubmissionsTable.isApproved,
      approvedAt: groupTaskSubmissionsTable.approvedAt,
      submittedAt: groupTaskSubmissionsTable.submittedAt,
      firstName: studentsTable.firstName,
      lastName: studentsTable.lastName,
    }).from(groupTaskSubmissionsTable)
      .innerJoin(studentsTable, eq(groupTaskSubmissionsTable.studentId, studentsTable.id))
      .where(and(eq(groupTaskSubmissionsTable.taskId, taskId), eq(groupTaskSubmissionsTable.groupId, groupId)))
      .orderBy(desc(groupTaskSubmissionsTable.submittedAt));

    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

router.post("/groups/:id/tasks/:taskId/submissions", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  const { fileName, objectPath, note } = req.body;

  if (!fileName || !objectPath) {
    return res.status(400).json({ error: "fileName and objectPath are required" });
  }

  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "Members only" });

    const [task] = await db.select().from(groupTasksTable)
      .where(and(eq(groupTasksTable.id, taskId), eq(groupTasksTable.groupId, groupId)));
    if (!task) return res.status(404).json({ error: "Task not found" });

    const [submission] = await db.insert(groupTaskSubmissionsTable)
      .values({ taskId, groupId, studentId: me.id, fileName: fileName.trim(), objectPath, note: note?.trim() || null })
      .returning();

    if (task.status === "todo" || task.status === "in_progress") {
      await db.update(groupTasksTable).set({ status: "review", updatedAt: new Date() })
        .where(eq(groupTasksTable.id, taskId));
    }

    res.status(201).json({ ...submission, firstName: me.firstName, lastName: me.lastName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit work" });
  }
});

router.patch("/groups/:id/tasks/:taskId/submissions/:subId/approve", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  const subId = Number(req.params.subId);

  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "Members only" });
    if (!["leader", "co-leader"].includes(membership.role)) {
      return res.status(403).json({ error: "Only leaders and co-leaders can approve submissions" });
    }

    const [sub] = await db.update(groupTaskSubmissionsTable)
      .set({ isApproved: true, approvedBy: me.id, approvedAt: new Date() })
      .where(and(eq(groupTaskSubmissionsTable.id, subId), eq(groupTaskSubmissionsTable.taskId, taskId)))
      .returning();

    await db.update(groupTasksTable)
      .set({ status: "done", updatedAt: new Date() })
      .where(and(eq(groupTasksTable.id, taskId), eq(groupTasksTable.groupId, groupId)));

    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: "Failed to approve submission" });
  }
});

// ── Group Rules ───────────────────────────────────────────────────────────────

router.get("/groups/:id/rules", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  try {
    const [group] = await db.select().from(discussionGroupsTable).where(eq(discussionGroupsTable.id, groupId));
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.isPrivate) {
      const membership = await isMember(groupId, me.id);
      if (!membership) return res.status(403).json({ error: "Members only" });
    }
    const rules = await db.select().from(groupRulesTable)
      .where(eq(groupRulesTable.groupId, groupId))
      .orderBy(asc(groupRulesTable.position), asc(groupRulesTable.createdAt));
    res.json(rules.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch rules" });
  }
});

router.post("/groups/:id/rules", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const { title, description } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Rule title is required" });
  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "Members only" });
    if (!["leader", "co-leader"].includes(membership.role)) return res.status(403).json({ error: "Only leaders can manage rules" });
    const existing = await db.select({ id: groupRulesTable.id }).from(groupRulesTable).where(eq(groupRulesTable.groupId, groupId));
    const [rule] = await db.insert(groupRulesTable)
      .values({ groupId, title: title.trim(), description: description?.trim() || null, position: existing.length, createdBy: me.id })
      .returning();
    res.status(201).json({ ...rule, createdAt: rule.createdAt.toISOString(), updatedAt: rule.updatedAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create rule" });
  }
});

router.patch("/groups/:id/rules/:ruleId", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const ruleId = Number(req.params.ruleId);
  const { title, description } = req.body;
  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "Members only" });
    if (!["leader", "co-leader"].includes(membership.role)) return res.status(403).json({ error: "Only leaders can manage rules" });
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    const [updated] = await db.update(groupRulesTable).set(updates)
      .where(and(eq(groupRulesTable.id, ruleId), eq(groupRulesTable.groupId, groupId)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Rule not found" });
    res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update rule" });
  }
});

router.delete("/groups/:id/rules/:ruleId", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const ruleId = Number(req.params.ruleId);
  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "Members only" });
    if (!["leader", "co-leader"].includes(membership.role)) return res.status(403).json({ error: "Only leaders can manage rules" });
    await db.delete(groupRulesTable).where(and(eq(groupRulesTable.id, ruleId), eq(groupRulesTable.groupId, groupId)));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete rule" });
  }
});

export default router;
