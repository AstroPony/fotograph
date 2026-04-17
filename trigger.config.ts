import { defineConfig } from "@trigger.dev/sdk";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF!,
  machine: "small-1x",
  maxDuration: 300,
  dirs: ["./src/trigger"],
  build: {
    extensions: [
      prismaExtension({
        mode: "engine-only",
      }),
    ],
  },
});
