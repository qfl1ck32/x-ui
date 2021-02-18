import * as React from "react";
import { RouteProps } from "react-router-dom";
import {
  ApolloCache,
  ApolloClient,
  ApolloClientOptions,
} from "@apollo/client/core";
import { GuardianSmart } from "./react";
import { Constructor } from "@kaviar/core";
import { INewSmartOptions } from "@kaviar/smart";
import { IComponents } from "./react";

export interface IXUIBundleConfig {
  graphql: Partial<ApolloClientOptions<any>>;
  guardianClass: Constructor<GuardianSmart>;
  guardianClassOptions?: INewSmartOptions;
  enableSubscriptions: boolean;
  react: {
    components: IComponents;
  };
}

export interface IRoute<T = IRouteParams, Q = IRouteParams> extends RouteProps {
  name?: string;
  /**
   * If the user has any of these roles, the route will render, otherwise it will render the component: "NotAuthorized" which can be modified
   */
  roles?: string[];
  path: string;
}

export type RouteMap = {
  [key: string]: IRoute<any>;
};

export interface IRouteGenerationProps<T = any, Q = any> {
  params?: T;
  query?: Q;
}

export interface IRouteParams {
  [key: string]: string | number;
}

// query?
