import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const teachers = pgTable("teachers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  bio: text("bio").default("").notNull(),
  avatarUrl: text("avatar_url").default("").notNull(),
  specialties: jsonb("specialties").$type<string[]>().default([]).notNull(),
  status: text("status").notNull().default("active"),
  sessionToken: text("session_token"),
  sessionExpiresAt: timestamp("session_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teacherInviteCodes = pgTable("teacher_invite_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("individual"),
  label: text("label").default("").notNull(),
  maxUses: integer("max_uses"),
  usesCount: integer("uses_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teacherStudents = pgTable("teacher_students", {
  id: uuid("id").defaultRandom().primaryKey(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  studentDeviceToken: text("student_device_token").notNull(),
  studentName: text("student_name").default("").notNull(),
  inviteCode: text("invite_code").default("").notNull(),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
  status: text("status").notNull().default("active"),
  notes: text("notes").default("").notNull(),
});

export const teacherClasses = pgTable("teacher_classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").default("").notNull(),
  type: text("type").notNull().default("individual"),
  studentConnectionIds: jsonb("student_connection_ids")
    .$type<string[]>()
    .default([])
    .notNull(),
  scheduledAt: timestamp("scheduled_at"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  meetingLink: text("meeting_link").default("").notNull(),
  notes: text("notes").default("").notNull(),
  status: text("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
