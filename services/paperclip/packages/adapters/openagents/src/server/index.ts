import type { ServerAdapterModule } from "@paperclipai/adapter-utils";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";
import { agentConfigurationDoc, models } from "../index.js";

export const openAgentsServerAdapter: ServerAdapterModule = {
  type: "openagents",
  execute,
  testEnvironment,
  models,
  agentConfigurationDoc,
};

export { execute, testEnvironment };
