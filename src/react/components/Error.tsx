import * as React from "react";

export type ErrorProps = {
  error: Error;
  errorInfo: React.ErrorInfo;
};

export function Error(props: ErrorProps) {
  return <div>An error occured. {props.error.toString()}</div>;
}
