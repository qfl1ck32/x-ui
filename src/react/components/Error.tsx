import * as React from "react";

export type ErrorProps = {
  error: Error;
  errorInfo: React.ErrorInfo;
};

export function Error(props: ErrorProps) {
  return <div>You spin me round round baby round round</div>;
}
