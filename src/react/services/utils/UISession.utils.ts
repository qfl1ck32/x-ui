import { IUISessionStore } from "../UISession.service";

const localStorageKey = "kaviar-UISession";

export const getLocalStorageState = (): Partial<IUISessionStore> =>
  JSON.parse(localStorage.getItem(localStorageKey));

export const updateLocalStorageState = <T extends keyof IUISessionStore>(
  key: T,
  value: IUISessionStore[T]
): void => {
  const newState = Object.assign(getLocalStorageState() || {}, {
    [key]: value,
  });

  localStorage.setItem(localStorageKey, JSON.stringify(newState));
};
