import { Kernel } from "@kaviar/core";
import { IUISessionDefaults } from "../react/services/UISession.service";
import { XUIBundle } from "../XUIBundle";

export const sessionDefaults = {
  lastAuthenticationDate: new Date("03-01-2000 00:00:00"),
  localStorageKey: "KAVIAR_UI_SESSION",
} as IUISessionDefaults;

export const kernel = new Kernel({
  parameters: {
    testing: true,
  },
  bundles: [
    new XUIBundle({
      session: sessionDefaults,
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
