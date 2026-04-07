#!/usr/bin/env node

import { runMain } from "citty";

import { createWranglerBuildsCommand } from "./cli-app.js";

await runMain(createWranglerBuildsCommand());
