import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ARCHITECTURAL_CATEGORIES = [
  { value: "history-theory",       label: "History & Theory" },
  { value: "design-methods",       label: "Design Methods" },
  { value: "structures",           label: "Structures & Engineering" },
  { value: "materials",            label: "Materials & Construction" },
  { value: "digital-tools",        label: "Digital Tools (BIM / CAD)" },
  { value: "professional-practice",label: "Professional Practice" },
  { value: "urban-design",         label: "Urban Design & Planning" },
  { value: "interior",             label: "Interior Architecture" },
  { value: "sustainability",       label: "Sustainability & Environment" },
  { value: "presentation",         label: "Presentation & Visualization" },
] as const;

export const resourcesTable = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("guide"),
  fileUrl: text("file_url"),
  imageUrl: text("image_url"),
  storedObjectPath: text("stored_object_path"),
  software: text("software"),
  category: text("category"),
  tags: text("tags"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertResourceSchema = createInsertSchema(resourcesTable).omit({ id: true, createdAt: true });
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resourcesTable.$inferSelect;
