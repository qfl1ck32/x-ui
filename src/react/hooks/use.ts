import { Constructor, Token } from "@kaviar/core";
import { useMemo } from "react";
import { useContainer } from "./index";

export const use = <T = any>(id: Constructor<T> | Token<T> | string): T => {
  const container = useContainer();
  return useMemo(() => {
    // eslint-disable-next-line
    // @ts-ignore
    return container.get(id);
  }, []);
};
