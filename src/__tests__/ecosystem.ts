import { Kernel } from "@kaviar/core";
import { IUISessionStore } from "../react/hooks/useUISession";
import { XUIBundle } from "../XUIBundle";

export const sessionDefaults = {
  lastAuthenticationTime: new Date("03-01-2000 00:00:00").getTime(),
} as IUISessionStore;

export const kernel = new Kernel({
  parameters: {
    testing: true,
  },
  bundles: [
    new XUIBundle({
      sessionDefaults,
    }),
  ],
});

export const container = kernel.container;

async function createEcosystem() {
  await kernel.init();
}

beforeAll(async () => {
  return createEcosystem();
});
