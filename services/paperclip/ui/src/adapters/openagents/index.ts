import type { UIAdapterModule } from "../types";
import { parseOpenAgentsStdoutLine } from "./parse-stdout";
import { OpenAgentsConfigFields } from "./config-fields";
import { buildOpenAgentsConfig } from "./build-config";

export const openAgentsUIAdapter: UIAdapterModule = {
  type: "openagents",
  label: "OpenAgents Network",
  parseStdoutLine: parseOpenAgentsStdoutLine,
  ConfigFields: OpenAgentsConfigFields,
  buildAdapterConfig: buildOpenAgentsConfig,
};
