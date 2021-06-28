import * as React from "react";
import { useState } from "react";
import { XUI_CONFIG_TOKEN } from "../../constants";
import { use } from "./use";
import {
  getLocalStorageState,
  updateLocalStorageState,
} from "./utils/useUISession.utils";

export interface IUISessionStore {
  lastAuthenticationTime: number;
}

export interface IUISessionConfig {
  persist?: boolean;
}

interface IListener {
  key: keyof IUISessionStore;
  handler: (
    previousValue: IUISessionStore[keyof IUISessionStore],
    newValue: IUISessionStore[keyof IUISessionStore]
  ) => IUISessionStore[keyof IUISessionStore];
}

export function useUISession() {
  const xuiConfig = use(XUI_CONFIG_TOKEN);
  const [isLoading, setIsInitialized] = useState(true);

  const [state, setState] = useState<Partial<IUISessionStore>>(
    xuiConfig.sessionDefaults
  );

  const listenersRef = React.useRef<IListener[]>([]);

  React.useEffect(() => {
    const defaultSessionState = xuiConfig.sessionDefaults;
    const localStorageState = getLocalStorageState();

    setState(Object.assign(defaultSessionState, localStorageState));
    setIsInitialized(false);
  }, []);

  const updateLocalStorage = <T extends keyof IUISessionStore>(
    key: T,
    value: IUISessionStore[T]
  ) => updateLocalStorageState(key, value);

  const get = (key: keyof IUISessionStore) => {
    return state[key];
  };

  const runListener = (
    key: keyof IUISessionStore,
    newValue: IUISessionStore[keyof IUISessionStore]
  ) => {
    const listener = listenersRef.current.find(
      (listener) => listener.key === key
    );

    if (!listener) return;

    const previousValue = state[key];

    return listener.handler(previousValue, newValue);
  };

  const set = <T extends keyof IUISessionStore>(
    key: T,
    value: IUISessionStore[T],
    options?: IUISessionConfig
  ) => {
    const listenerValueIfExists = runListener(key, value);

    const newValue = (listenerValueIfExists || value) as IUISessionStore[T];

    setState((prevState) => ({ ...prevState, [key]: newValue }));

    if (options?.persist) {
      updateLocalStorage(key, newValue);
    }
  };

  const onSet = <T extends keyof IUISessionStore>(
    key: T,
    handler: (
      previousValue: IUISessionStore[T],
      newValue: IUISessionStore[T]
    ) => IUISessionStore[T]
  ) => {
    listenersRef.current = listenersRef.current
      .filter((listener) => listener.key !== key)
      .concat({
        key,
        handler,
      });
  };

  const onSetRemove = <T extends keyof IUISessionStore>(key: T) => {
    listenersRef.current = listenersRef.current.filter(
      (listener) => listener.key !== key
    );
  };

  return {
    isLoading,
    state,
    get,
    set,
    onSet,
    onSetRemove,
  };
}
