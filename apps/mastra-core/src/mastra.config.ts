import { Mastra } from "@mastra/core/mastra";
import { collegeAgent } from "./agent.js";

export const mastra = new Mastra({
  agents: { collegeAgent },
});