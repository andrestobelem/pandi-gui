import { z } from "zod";

export const AGENT_COMMAND_CHANNEL = "agent:command";
export const AGENT_EVENT_CHANNEL = "agent:event";
export const AGENT_TOOL_TEXT_MAX_LENGTH = 32_000;
export const AGENT_TOOL_ID_MAX_LENGTH = 200;
export const AGENT_TOOL_NAME_MAX_LENGTH = 100;
export const SESSION_ID_MAX_LENGTH = 200;
export const SESSION_TITLE_MAX_LENGTH = 120;

const sessionIdSchema = z
  .string()
  .min(1)
  .max(SESSION_ID_MAX_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/);

const sessionSummarySchema = z.object({
  id: sessionIdSchema,
  title: z.string().min(1).max(SESSION_TITLE_MAX_LENGTH),
  modifiedAt: z.string().datetime(),
  isActive: z.boolean(),
});

const agentHostCommandSchema = z.discriminatedUnion("type", [
  z.object({
    version: z.literal(1),
    type: z.literal("prompt"),
    text: z.string().trim().min(1),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("abort"),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("session.restore"),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("session.new"),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("session.list"),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("session.open"),
    id: sessionIdSchema,
  }),
]);

const transcriptItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("response"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("tool"),
    id: z.string().min(1).max(AGENT_TOOL_ID_MAX_LENGTH),
    name: z.string().min(1).max(AGENT_TOOL_NAME_MAX_LENGTH),
    input: z.string().max(AGENT_TOOL_TEXT_MAX_LENGTH),
    result: z.string().max(AGENT_TOOL_TEXT_MAX_LENGTH),
    isError: z.boolean(),
  }),
]);

const transcriptRunSchema = z.object({
  prompt: z.string(),
  items: z.array(transcriptItemSchema),
  status: z.enum(["settled", "failed"]),
  error: z.string().optional(),
});

const agentHostEventSchema = z.discriminatedUnion("type", [
  z.object({
    version: z.literal(1),
    type: z.literal("session.created"),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("session.restored"),
    runs: z.array(transcriptRunSchema),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("sessions.listed"),
    sessions: z.array(sessionSummarySchema),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("session.opened"),
    id: sessionIdSchema,
    runs: z.array(transcriptRunSchema),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("agent.started"),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("message.delta"),
    text: z.string(),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("tool.started"),
    id: z.string().min(1).max(AGENT_TOOL_ID_MAX_LENGTH),
    name: z.string().min(1).max(AGENT_TOOL_NAME_MAX_LENGTH),
    input: z.string().max(AGENT_TOOL_TEXT_MAX_LENGTH),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("tool.completed"),
    id: z.string().min(1).max(AGENT_TOOL_ID_MAX_LENGTH),
    name: z.string().min(1).max(AGENT_TOOL_NAME_MAX_LENGTH),
    result: z.string().max(AGENT_TOOL_TEXT_MAX_LENGTH),
    isError: z.boolean(),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("agent.settled"),
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("agent.failed"),
    message: z.string(),
  }),
]);

export type AgentHostCommand = z.infer<typeof agentHostCommandSchema>;
export type TranscriptItem = z.infer<typeof transcriptItemSchema>;
export type TranscriptRun = z.infer<typeof transcriptRunSchema>;
export type SessionSummary = z.infer<typeof sessionSummarySchema>;
export type AgentHostEvent = z.infer<typeof agentHostEventSchema>;

export function parseAgentHostCommand(value: unknown): AgentHostCommand {
  return agentHostCommandSchema.parse(value);
}

export function parseAgentHostEvent(value: unknown): AgentHostEvent {
  return agentHostEventSchema.parse(value);
}
