import {
  ApolloClient as BaseApolloClient,
  ApolloClientOptions,
} from "@apollo/client/core";
import { Service, Inject } from "@kaviar/core";
import { APOLLO_CLIENT_OPTIONS_TOKEN } from "../constants";
import { createSplitLink } from "./splitLink";

@Service()
export class ApolloClient extends BaseApolloClient<any> {
  constructor(
    @Inject(APOLLO_CLIENT_OPTIONS_TOKEN)
    options: ApolloClientOptions<any>
  ) {
    super({
      ...options,
      link: createSplitLink(options.uri),
    });
  }
}
