import * as React from "react";
import { useGuardian } from "../hooks";
import { Loading } from "./Loading";
import { NotAuthorized } from "./NotAuthorized";
import { useUIComponents } from "../hooks/useUIComponents";

export type ProtectProps = {
  /**
   * If you don't specify any roles it will ensure that the user is logged in.
   */
  roles?: string[];
  component?: React.ComponentType<any>;
  componentProps?: AnyProps;
  children?: any;
};

type AnyProps = {
  [key: string]: any;
};

export function Protect(props: ProtectProps) {
  const { roles, ...restProps } = props;
  const guardian = useGuardian();
  const UIComponents = useUIComponents();

  if (!guardian.state.initialised) {
    return <Loading />;
  }

  const shouldRender = roles
    ? guardian.hasRole(roles)
    : guardian.state.isLoggedIn;

  if (shouldRender) {
    if (props.children) {
      return props.children;
    }
    return React.createElement(props.component, props.componentProps);
  } else {
    return <UIComponents.NotAuthorized roles={props.roles} />;
  }
}
