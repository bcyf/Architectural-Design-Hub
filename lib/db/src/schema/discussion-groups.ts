import { pgTable, text, serial, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { studentsTable } from "./students";

export const groupCategoryEnum = pgEnum("group_category", ["project", "assignment", "general", "critique", "study"]);
export const memberRoleEnum = pgEnum("member_role", ["leader", "co-leader", "designer", "researcher", "reviewer", "member"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "review", "done"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high"]);

export const discussionGroupsTable = pgTable("discussion_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: groupCategoryEnum("category").notNull().default("general"),
  isPrivate: boolean("is_private").notNull().default(false),
  coverColor: text("cover_color").default("#16a34a"),
  createdBy: integer("created_by").references(() => studentsTable.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const groupMembersTable = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => discussionGroupsTable.id, { onDelete: "cascade" }).notNull(),
  studentId: integer("student_id").references(() => studentsTable.id, { onDelete: "cascade" }).notNull(),
  role: memberRoleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const groupMessagesTable = pgTable("group_messages", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => discussionGroupsTable.id, { onDelete: "cascade" }).notNull(),
  studentId: integer("student_id").references(() => studentsTable.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupTasksTable = pgTable("group_tasks", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => discussionGroupsTable.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: integer("assigned_to").references(() => studentsTable.id),
  status: taskStatusEnum("status").notNull().default("todo"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  dueDate: text("due_date"),
  createdBy: integer("created_by").references(() => studentsTable.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type DiscussionGroup = typeof discussionGroupsTable.$inferSelect;
export type GroupMember = typeof groupMembersTable.$inferSelect;
export type GroupMessage = typeof groupMessagesTable.$inferSelect;
export type GroupTask = typeof groupTasksTable.$inferSelect;
