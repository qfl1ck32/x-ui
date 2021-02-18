import React from "react";

export type NotAuthorizedProps = {
  roles?: string[];
};

export function NotAuthorized(props: NotAuthorizedProps) {
  return (
    <div>
      <h1>You are not currently authorised to view this page</h1>
    </div>
  );
}
