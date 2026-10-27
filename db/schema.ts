import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(), title: text("title").notNull(), content: text("content").notNull().default(""), kind: text("kind", { enum: ["note", "pdf", "audio"] }).notNull().default("note"), folder: text("folder").notNull().default("Unsorted"), size: text("size").notNull().default("1 KB"), objectKey: text("object_key"), starred: integer("starred", { mode: "boolean" }).notNull().default(false), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});
