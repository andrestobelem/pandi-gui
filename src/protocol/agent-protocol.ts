import { z } from "zod";

export const AGENT_COMMAND_CHANNEL = "agent:command";
export const AGENT_EVENT_CHANNEL = "agent:event";

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
