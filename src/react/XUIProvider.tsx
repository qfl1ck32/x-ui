import * as React from "react";
import { useEffect, useState } from "react";
import { Kernel, ContainerInstance } from "@kaviar/core";
import { XRouter } from "./XRouter";
import { ApolloProvider } from "@apollo/client/react";
import { ApolloClient } from "../graphql/ApolloClient";
import { useContainer } from "./hooks";
import { use } from "./hooks";
import { XBrowserRouter } from "./XBrowserRouter";

export const ContainerContext = React.createContext<ContainerInstance>(null);
ContainerContext.displayName = "KaviarContainer";

export interface IProps {
  kernel: Kernel;
  loading?: React.ReactElement<any>;
  children?: any;
}

export const XUIProvider = (props: IProps) => {
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

export const XUIProviderInitialised = ({ children }) => {
  const router = use(XRouter);
  const graphqlClient = use(ApolloClient);

  return (
    <ApolloProvider client={graphqlClient}>
      {children ? children : null}
      <XBrowserRouter router={router} />
    </ApolloProvider>
  );
};
