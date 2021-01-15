import * as React from "react";
import { RouteProps } from "react-router-dom";
import {
  ApolloCache,
  ApolloClient,
  ApolloClientOptions,
} from "@apollo/client/core";

export interface IXUIBundleConfig {
  graphql: Partial<ApolloClientOptions<any>>;
  react: {
    components: {
      notFound: React.ComponentType<any>;
      loading: React.ComponentType<any>;
    };
    title: string;
    description: string;
  };
}

export interface IRoute<T = IRouteParams, Q = IRouteParams> extends RouteProps {
  name?: string;
  path: string;
}

export interface IRouteGenerationProps<T = any, Q = any> {
  params?: T;
  query?: Q;
}

export interface IRouteParams {
  [key: string]: string | number;
}

// query?
