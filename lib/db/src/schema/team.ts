import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const teamTable = pgTable("team", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  year: text("year").notNull(),
  bio: text("bio").notNull(),
  interests: text("interests").notNull(),
  imageUrl: text("image_url"),
  email: text("email"),
  instagram: text("instagram"),
  linkedin: text("linkedin"),
  order: integer("order").notNull().default(0),
});

export const insertTeamSchema = createInsertSchema(teamTable).omit({ id: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type TeamMember = typeof teamTable.$inferSelect;
