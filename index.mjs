import { createRequire } from "module";

const require = createRequire(import.meta.url);
const adk = require("./index.js");

export const createADK = adk.createADK;
export const Agent = adk.Agent;
export const tool = adk.tool;
export const Emitter = adk.Emitter;
export const run = adk.run;
export const getDefaultADK = adk.getDefaultADK;
export const AgentRegistry = adk.AgentRegistry;
export const ToolRegistry = adk.ToolRegistry;
export const buildRunBody = adk.buildRunBody;
export const toolsToApiSchemas = adk.toolsToApiSchemas;

export default adk;
