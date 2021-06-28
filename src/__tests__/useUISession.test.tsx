import { act, renderHook } from "@testing-library/react-hooks";
import * as _ from "lodash";
import * as React from "react";
import { ContainerContext } from "..";
import { useUISession } from "../react/hooks";
import { getLocalStorageState } from "../react/hooks/utils/useUISession.utils";
import { container, sessionDefaults } from "./ecosystem";

const containerContextProvider = ({ children }) => {
  return (
    <ContainerContext.Provider value={container}>
      {children}
    </ContainerContext.Provider>
  );
};

const getSessionHook = () => {
  const { result } = renderHook(() => useUISession(), {
    wrapper: containerContextProvider,
  });

  return result;
};

describe("useUISession", () => {
  test("sessionDefaults", () => {
    const sessionHook = getSessionHook();

    expect(sessionHook.current.state).toStrictEqual(sessionDefaults);
  });

  test("set and get", () => {
    const sessionHook = getSessionHook();

    const lastAuthenticationTime = new Date().getTime();
    act(() =>
      sessionHook.current.set("lastAuthenticationTime", lastAuthenticationTime)
    );
    expect(sessionHook.current.get("lastAuthenticationTime")).toBe(
      lastAuthenticationTime
    );
  });

  test("onSet and onSetRemove", () => {
    const sessionHook = getSessionHook();

    const lastAuthenticationTime = new Date().getTime();
    const handler = (previousValue: number, newValue: number) =>
      previousValue + newValue;

    act(() => sessionHook.current.onSet("lastAuthenticationTime", handler));
    act(() =>
      sessionHook.current.set("lastAuthenticationTime", lastAuthenticationTime)
    );
    expect(sessionHook.current.get("lastAuthenticationTime")).toBe(
      handler(sessionDefaults.lastAuthenticationTime, lastAuthenticationTime)
    );

    act(() => sessionHook.current.onSetRemove("lastAuthenticationTime"));
    act(() =>
      sessionHook.current.set("lastAuthenticationTime", lastAuthenticationTime)
    );
    expect(sessionHook.current.get("lastAuthenticationTime")).toBe(
      lastAuthenticationTime
    );
  });

  test("persistance - simple set", () => {
    const sessionHook = getSessionHook();

    const lastAuthenticationTime = new Date().getTime();
    act(() =>
      sessionHook.current.set(
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

  test("persistance - set with handler", () => {
    const sessionHook = getSessionHook();

    const handler = (previousValue: number, newValue: number) =>
      previousValue + newValue;

    const previousAuthenticationTime = sessionHook.current.get(
      "lastAuthenticationTime"
    );
    const newAuthenticationTime = new Date().getTime();
    act(() => sessionHook.current.onSet("lastAuthenticationTime", handler));
    act(() =>
      sessionHook.current.set("lastAuthenticationTime", newAuthenticationTime, {
        persist: true,
      })
    );

    expect(sessionHook.current.get("lastAuthenticationTime")).toBe(
      handler(previousAuthenticationTime, newAuthenticationTime)
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
