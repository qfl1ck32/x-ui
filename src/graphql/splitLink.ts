import { split, HttpLink } from "@apollo/client";
import { getMainDefinition } from "@apollo/client/utilities";
import { WebSocketLink } from "@apollo/client/link/ws";

export function createSplitLink(uri) {
  const httpLink = new HttpLink({
    uri,
  });
  const wsLink = new WebSocketLink({
    uri: uri.replace("http://", "ws://").replace("https://", "wss://"),
    options: {
      reconnect: true,
    },
  });
  // The split function takes three parameters:
  //
  // * A function that's called for each operation to execute
  // * The Link to use for an operation if the function returns a "truthy" value
  // * The Link to use for an operation if the function returns a "falsy" value
  return split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === "OperationDefinition" &&
        definition.operation === "subscription"
      );
    },
    wsLink,
    httpLink
  );
}
