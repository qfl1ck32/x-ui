import { act, renderHook, RenderResult } from "@testing-library/react-hooks";
import * as _ from "lodash";
import * as React from "react";
import { ContainerContext } from "..";
import { useUISession } from "../react/hooks";
import {
  IUISessionStore,
  UISession,
} from "../react/services/UISession.service";
import { getLocalStorageState } from "../react/services/utils/UISession.utils";
import { container, sessionDefaults } from "./ecosystem";

const containerContextProvider = ({ children }) => {
  return (
    <ContainerContext.Provider value={container}>
      {children}
    </ContainerContext.Provider>
  );
};

const getSessionHook = () => {
  const { result } = renderHook(useUISession, {
    wrapper: containerContextProvider,
  });

  return result;
};

const getFieldHook = <T extends keyof IUISessionStore>(
  sessionHook: RenderResult<UISession>,
  fieldName: T
) => {
  const { result } = renderHook(() => sessionHook.current.get(fieldName));

  return result;
};

describe("useUISession", () => {
  test("sessionDefaults", () => {
    const sessionHook = getSessionHook();

    expect(sessionHook.current.state).toStrictEqual(sessionDefaults);
  });

  test("set and get", async () => {
    const sessionHook = getSessionHook();

    const lastAuthenticationTime = new Date().getTime();

    await act(
      async () =>
        await sessionHook.current.set(
          "lastAuthenticationTime",
          lastAuthenticationTime
        )
    );

    const fieldHook = getFieldHook(sessionHook, "lastAuthenticationTime");

    expect(fieldHook.current[0]).toBe(lastAuthenticationTime);
  });

  test("onSet and onSetRemove", async () => {
    const sessionHook = getSessionHook();

    const lastAuthenticationTime = new Date().getTime();

    let handlerIsCalled = false;

    const handler = async (_: number, _2: number) => {
      handlerIsCalled = !handlerIsCalled;
    };

    act(() => sessionHook.current.onSet("lastAuthenticationTime", handler));

    await act(
      async () =>
        await sessionHook.current.set(
          "lastAuthenticationTime",
          lastAuthenticationTime
        )
    );

    expect(handlerIsCalled).toBe(true);

    act(() =>
      sessionHook.current.onSetRemove("lastAuthenticationTime", handler)
    );

    await act(
      async () =>
        await sessionHook.current.set(
          "lastAuthenticationTime",
          lastAuthenticationTime
        )
    );

    expect(handlerIsCalled).toBe(true);
  });

  test("persistance - simple set", async () => {
    const sessionHook = getSessionHook();

    const lastAuthenticationTime = new Date().getTime();

    await act(
      async () =>
        await sessionHook.current.set(
          "lastAuthenticationTime",
          lastAuthenticationTime,
          { persist: true }
        )
    );

    const localStorageState = getLocalStorageState();

    expect(localStorageState.lastAuthenticationTime).toEqual(
      lastAuthenticationTime
    );
  });

  test("persistance - set with handler", async () => {
    const sessionHook = getSessionHook();

    let handlerIsCalled = false;

    const handler = async (_: number, _2: number) => {
      handlerIsCalled = !handlerIsCalled;
    };

    const newAuthenticationTime = new Date().getTime();

    act(() => sessionHook.current.onSet("lastAuthenticationTime", handler));

    await act(
      async () =>
        await sessionHook.current.set(
          "lastAuthenticationTime",
          newAuthenticationTime,
          {
            persist: true,
          }
        )
    );

    const localStorageState = getLocalStorageState();

    expect(handlerIsCalled).toBe(true);
    expect(localStorageState.lastAuthenticationTime).toBe(
      newAuthenticationTime
    );
  });

  test("uses existing values from localStorage, and defaults for rest", () => {
    const sessionHook = getSessionHook();

    const localStorageState = getLocalStorageState();

    const localStorageStateKeys = Object.keys(localStorageState);

    for (const key of Object.keys(sessionDefaults)) {
      const value = sessionHook.current.state[key];
      if (localStorageStateKeys.includes(key)) {
        expect(value).toBe(localStorageState[key]);
      } else {
        expect(value).toBe(sessionDefaults[key]);
      }
    }
  });
});
