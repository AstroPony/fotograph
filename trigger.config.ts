import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF!,
  machine: "small-1x",
  maxDuration: 300,
  dirs: ["./src/trigger"],
});
