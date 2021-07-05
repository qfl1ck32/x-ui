import { ContainerInstance, EventManager, Service, Event } from "@kaviar/core";
import { useEffect, useState } from "react";
import { IUISessionStateChangeEvent, XUI_CONFIG_TOKEN } from "../..";
import { UISessionStateChangeEvent } from "../../events";
import {
  getLocalStorageState,
  updateLocalStorageState,
} from "./utils/UISession.utils";

export interface IUISessionStore {
  lastAuthenticationDate: Date;
}

export interface IUISessionOptions {
  persist?: boolean;
}

export type IUISessionHandler = (
  event: Event<IUISessionStateChangeEvent>
) => Promise<void>;

interface IUISessionConfig {
  localStorageKey: string;
}

export interface IUISessionDefaults
  extends Partial<IUISessionStore>,
    IUISessionConfig {}

@Service()
export class UISession {
  constructor(
    protected readonly container: ContainerInstance,
    protected readonly eventManager: EventManager
  ) {
    const { session } = this.container.get(XUI_CONFIG_TOKEN);

    const { localStorageKey, ...defaultSession } = session;

    const localStorageState = getLocalStorageState(localStorageKey);

    this.state = Object.assign(defaultSession, localStorageState);

    this.localStorageKey = localStorageKey;
  }

  state: Partial<IUISessionStore>;
  private localStorageKey: string;

  public get<T extends keyof IUISessionStore>(fieldName: T) {
    const [value, setValue] = useState(this.state[fieldName]);

    useEffect(() => {
      const handler = async (e: Event<IUISessionStateChangeEvent>) => {
        setValue(e.data.value);
      };

      this.onSet(fieldName, handler);

      return () => {
        this.eventManager.removeListener(UISessionStateChangeEvent, handler);
      };
    }, []);

    return value;
  }

  public async set<T extends keyof IUISessionStore>(
    fieldName: T,
    value: IUISessionStore[T],
    options?: IUISessionOptions
  ) {
    const previousValue = this.state[fieldName];

    this.state = Object.assign(this.state, {
      ...this.state,
      [fieldName]: value,
    });

    if (options?.persist) {
      updateLocalStorageState(fieldName, value, this.localStorageKey);
    }

    return this.eventManager.emit(
      new UISessionStateChangeEvent({
        fieldName,
        value: value,
        previousValue,
      })
    );
  }

  onSet<T extends keyof IUISessionStore>(
    fieldName: T,
    handler: IUISessionHandler
  ) {
    this.eventManager.addListener(UISessionStateChangeEvent, handler, {
      filter: (e) => e.data.fieldName === fieldName,
    });
  }

  onSetRemove(handler: IUISessionHandler) {
    this.eventManager.removeListener(UISessionStateChangeEvent, handler);
  }
}
