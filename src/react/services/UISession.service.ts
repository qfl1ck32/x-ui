import { ContainerInstance, EventManager, Service, Event } from "@kaviar/core";
import { useEffect, useState } from "react";
import { IUISessionStateChangeEvent, XUI_CONFIG_TOKEN } from "../..";
import { UISessionStateChangeEvent } from "../../events";
import {
  getLocalStorageState,
  updateLocalStorageState,
} from "./utils/UISession.utils";

export interface IUISessionStore {
  lastAuthenticationTime: number;
}

export interface IUISessionConfig {
  persist?: boolean;
}

export type IHandler = (
  previousValue: IUISessionStore[keyof IUISessionStore],
  newValue: IUISessionStore[keyof IUISessionStore]
) => Promise<void>;

export interface IListenerAndHandler {
  handler: IHandler;
  listener: (event: Event<IUISessionStateChangeEvent>) => Promise<void>;
}

@Service()
export class UISession {
  constructor(
    protected readonly container: ContainerInstance,
    protected readonly eventManager: EventManager
  ) {
    const { sessionDefaults } = this.container.get(XUI_CONFIG_TOKEN);
    const localStorageState = getLocalStorageState();

    this.state = Object.assign(sessionDefaults, localStorageState);
    this.listenersAndHandlers = new Map();
  }

  state: Partial<IUISessionStore>;
  listenersAndHandlers: Map<keyof IUISessionStore, IListenerAndHandler[]>;

  get = <T extends keyof IUISessionStore>(fieldName: T) => {
    const [value, setValue] = useState(this.state[fieldName]);

    useEffect(() => {
      const handler = async (value: IUISessionStore[T]) => setValue(value);
      this.onSet(fieldName, handler);
      return () => {
        this.listenersAndHandlers
          .get(fieldName)
          .map((value) => this.onSetRemove(fieldName, value.handler));
      };
    }, []);

    return [value, setValue];
  };

  set = async <T extends keyof IUISessionStore>(
    fieldName: T,
    value: IUISessionStore[T],
    options?: IUISessionConfig
  ) => {
    this.state = Object.assign(this.state, {
      ...this.state,
      [fieldName]: value,
    });

    await this.eventManager.emit(
      new UISessionStateChangeEvent({
        fieldName,
        value,
      })
    );

    if (options?.persist) {
      updateLocalStorageState(fieldName, value);
    }
  };

  onSet = <T extends keyof IUISessionStore>(
    fieldName: T,
    handler: (
      previousValue: IUISessionStore[T],
      newValue: IUISessionStore[T]
    ) => Promise<void>
  ) => {
    const listener = async (event: Event<IUISessionStateChangeEvent>) => {
      await handler(this.state[fieldName], event.data.value);
    };

    const listenersAndHandlers = this.listenersAndHandlers.get(fieldName) || [];

    const existsListenerSameHandler = listenersAndHandlers.some(
      ({ handler: _handler }) => _handler === handler
    );

    if (existsListenerSameHandler)
      throw new Error("Same handler already exists.");

    this.listenersAndHandlers.set(
      fieldName,
      listenersAndHandlers.concat({ listener, handler })
    );

    this.eventManager.addListener(UISessionStateChangeEvent, listener);
  };

  onSetRemove = <T extends keyof IUISessionStore>(
    fieldName: T,
    handler: (
      previousValue: IUISessionStore[T],
      newValue: IUISessionStore[T]
    ) => Promise<void>
  ) => {
    const listener = this.listenersAndHandlers
      .get(fieldName)
      .find((value) => value.handler === handler)?.listener;

    if (!listener) throw new Error("Listener doesn't exist.");

    this.listenersAndHandlers.set(
      fieldName,
      this.listenersAndHandlers
        .get(fieldName)
        .filter((value) => value.handler !== handler)
    );

    this.eventManager.removeListener(UISessionStateChangeEvent, listener);
  };
}
