import { Router, type IRouter, type Request, type Response } from "express";
import { db, discussionGroupsTable, groupMembersTable, groupMessagesTable, groupTasksTable, studentsTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireStudentAuth } from "./students";

const router: IRouter = Router();

// ── helpers ──────────────────────────────────────────────────────────────────

async function isMember(groupId: number, studentId: number) {
  const [row] = await db.select().from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.studentId, studentId)));
  return row ?? null;
}

// ── Groups CRUD ───────────────────────────────────────────────────────────────

// GET /groups  – list groups the student is in + public groups they haven't joined
router.get("/groups", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  try {
    const myMemberships = await db.select({ groupId: groupMembersTable.groupId })
      .from(groupMembersTable).where(eq(groupMembersTable.studentId, me.id));
    const myGroupIds = myMemberships.map(m => m.groupId);

    const allGroups = await db.select({
      id: discussionGroupsTable.id,
      name: discussionGroupsTable.name,
      description: discussionGroupsTable.description,
      category: discussionGroupsTable.category,
      isPrivate: discussionGroupsTable.isPrivate,
      coverColor: discussionGroupsTable.coverColor,
      createdBy: discussionGroupsTable.createdBy,
      createdAt: discussionGroupsTable.createdAt,
    }).from(discussionGroupsTable).orderBy(desc(discussionGroupsTable.createdAt));

    const memberCounts = await db.select({ groupId: groupMembersTable.groupId })
      .from(groupMembersTable);
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

// POST /groups – create a new group
router.post("/groups", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const { name, description, category, isPrivate, coverColor } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Group name is required" });

  try {
    const [group] = await db.insert(discussionGroupsTable)
      .values({ name: name.trim(), description: description?.trim(), category: category || "general", isPrivate: !!isPrivate, coverColor: coverColor || "#16a34a", createdBy: me.id })
      .returning();

    // Creator automatically joins as leader
    await db.insert(groupMembersTable).values({ groupId: group.id, studentId: me.id, role: "leader" });

    res.status(201).json({ ...group, memberCount: 1, isMember: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create group" });
  }
});

// GET /groups/:id – full group details
router.get("/groups/:id", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);

  try {
    const [group] = await db.select().from(discussionGroupsTable).where(eq(discussionGroupsTable.id, groupId));
    if (!group) return res.status(404).json({ error: "Group not found" });

    const membership = await isMember(groupId, me.id);
    if (group.isPrivate && !membership) return res.status(403).json({ error: "This is a private group" });

    const members = await db.select({
      id: groupMembersTable.id,
      studentId: groupMembersTable.studentId,
      role: groupMembersTable.role,
      joinedAt: groupMembersTable.joinedAt,
      firstName: studentsTable.firstName,
      lastName: studentsTable.lastName,
      email: studentsTable.email,
      studentIdCode: studentsTable.studentId,
    }).from(groupMembersTable)
      .innerJoin(studentsTable, eq(groupMembersTable.studentId, studentsTable.id))
      .where(eq(groupMembersTable.groupId, groupId));

    res.json({ ...group, members, myRole: membership?.role ?? null, isMember: !!membership });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch group" });
  }
});

// POST /groups/:id/join
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
    const memberRole = validRoles.includes(role) ? role : "member";

    await db.insert(groupMembersTable).values({ groupId, studentId: me.id, role: memberRole });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to join group" });
  }
});

// POST /groups/:id/leave
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

// PATCH /groups/:id/members/:memberId/role – update own role
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

// GET /groups/:id/messages
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
      createdAt: groupMessagesTable.createdAt,
      studentId: groupMessagesTable.studentId,
      firstName: studentsTable.firstName,
      lastName: studentsTable.lastName,
    }).from(groupMessagesTable)
      .innerJoin(studentsTable, eq(groupMessagesTable.studentId, studentsTable.id))
      .where(eq(groupMessagesTable.groupId, groupId))
      .orderBy(groupMessagesTable.createdAt);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /groups/:id/messages
router.post("/groups/:id/messages", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Message cannot be empty" });

  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "You must be a member to post" });

    const [msg] = await db.insert(groupMessagesTable)
      .values({ groupId, studentId: me.id, content: content.trim() })
      .returning();

    res.status(201).json({ ...msg, firstName: me.firstName, lastName: me.lastName });
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ── Tasks ─────────────────────────────────────────────────────────────────────

// GET /groups/:id/tasks
router.get("/groups/:id/tasks", requireStudentAuth, async (req: Request, res: Response) => {
  const me = (req as any).student;
  const groupId = Number(req.params.id);

  try {
    const membership = await isMember(groupId, me.id);
    if (!membership) return res.status(403).json({ error: "Members only" });

    const tasks = await db.select({
      id: groupTasksTable.id,
      title: groupTasksTable.title,
      description: groupTasksTable.description,
      status: groupTasksTable.status,
      priority: groupTasksTable.priority,
      dueDate: groupTasksTable.dueDate,
      createdAt: groupTasksTable.createdAt,
      updatedAt: groupTasksTable.updatedAt,
      assignedTo: groupTasksTable.assignedTo,
      createdBy: groupTasksTable.createdBy,
      assigneeName: studentsTable.firstName,
      assigneeLastName: studentsTable.lastName,
    }).from(groupTasksTable)
      .leftJoin(studentsTable, eq(groupTasksTable.assignedTo, studentsTable.id))
      .where(eq(groupTasksTable.groupId, groupId))
      .orderBy(groupTasksTable.createdAt);

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// POST /groups/:id/tasks
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

// PATCH /groups/:id/tasks/:taskId
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

// DELETE /groups/:id/tasks/:taskId
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

export default router;
