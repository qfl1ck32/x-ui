import {
  ContainerInstance,
  EventManager,
  Constructor,
  IEventConstructor,
  Token,
} from "@kaviar/core";
import { useContext, useEffect, useMemo } from "react";

import { ContainerContext } from "./XUIProvider";
import { XRouter } from "./XRouter";

export const useContainer = (): ContainerInstance => {
  return useContext(ContainerContext);
};

export const use = <T = any>(
  id: Constructor<T> | Token<T> | { service: T } | any
): T => {
  const container = useContainer();
  return useMemo(() => {
    return container.get(id);
  }, []);
};

export const useRouter = (): XRouter => {
  return use<XRouter>(XRouter);
};

export const useEventManager = (): EventManager => {
  return use<EventManager>(EventManager);
};

export const useListener = (
  eventClass: IEventConstructor<any>,
  listener: (e: any) => any
) => {
  const manager = useEventManager();
  useEffect(() => {
    manager.addListener(eventClass, listener);

    return () => {
      manager.removeListener(eventClass, listener);
    };
  }, []);
};
