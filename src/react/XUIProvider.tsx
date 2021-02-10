import * as React from "react";
import { useEffect, useState } from "react";
import { Kernel, ContainerInstance, Constructor } from "@kaviar/core";
import { XRouter } from "./XRouter";
import { ApolloProvider } from "@apollo/client/react";
import { ApolloClient } from "../graphql/ApolloClient";
import { useContainer } from "./hooks";
import { use } from "./hooks";
import { XBrowserRouter } from "./XBrowserRouter";
import { newSmart } from "./smart";
import { GuardianSmart } from "./smarts/GuardianSmart";
import { XUI_CONFIG_TOKEN } from "../constants";

export const ContainerContext = React.createContext<ContainerInstance>(null);
ContainerContext.displayName = "KaviarContainer";

export interface IXUIProviderProps {
  kernel: Kernel;
  loading?: React.ReactElement<any>;
  children?: any;
  guardianClass?: Constructor<GuardianSmart>;
}

export const XUIProvider = (props: IXUIProviderProps) => {
  const { kernel, children } = props;
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    kernel
      .init()
      .then(() => {
        setIsInitialized(true);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  if (!isInitialized) {
    if (props.loading) {
      return props.loading;
    } else {
      return null;
    }
  }

  return (
    <ContainerContext.Provider value={kernel.container}>
      <XUIProviderInitialised>
        {children ? children : null}
      </XUIProviderInitialised>
    </ContainerContext.Provider>
  );
};

interface IXUIProviderInitialisedProps {
  children?: any;
  guardianClass?: Constructor<GuardianSmart>;
}

export const XUIProviderInitialised = ({
  children,
  guardianClass,
}: IXUIProviderInitialisedProps) => {
  const router = use(XRouter);
  const xuiConfig = use(XUI_CONFIG_TOKEN);
  const graphqlClient = use(ApolloClient);
  const [guardian, GuardianProvider] = newSmart(xuiConfig.guardianClass);

  return (
    <ApolloProvider client={graphqlClient}>
      <GuardianProvider>
        {children ? children : null}
        <XBrowserRouter router={router} />
      </GuardianProvider>
    </ApolloProvider>
  );
};
