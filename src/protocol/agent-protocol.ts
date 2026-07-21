import { z } from "zod";

export const AGENT_COMMAND_CHANNEL = "agent:command";
export const AGENT_EVENT_CHANNEL = "agent:event";
export const AGENT_TOOL_TEXT_MAX_LENGTH = 32_000;
export const AGENT_TOOL_ID_MAX_LENGTH = 200;
export const AGENT_TOOL_NAME_MAX_LENGTH = 100;

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
]);

const agentHostEventSchema = z.discriminatedUnion("type", [
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
export type AgentHostEvent = z.infer<typeof agentHostEventSchema>;

export function parseAgentHostCommand(value: unknown): AgentHostCommand {
  return agentHostCommandSchema.parse(value);
}

export function parseAgentHostEvent(value: unknown): AgentHostEvent {
  return agentHostEventSchema.parse(value);
}
