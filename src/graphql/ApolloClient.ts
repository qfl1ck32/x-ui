import {
  ApolloClient as BaseApolloClient,
  ApolloClientOptions,
} from "@apollo/client/core";
import { Service, Inject } from "@kaviar/core";
import { APOLLO_CLIENT_OPTIONS_TOKEN } from "../constants";

@Service()
export class ApolloClient extends BaseApolloClient<any> {
  constructor(
    @Inject(APOLLO_CLIENT_OPTIONS_TOKEN)
    options: ApolloClientOptions<any>
  ) {
    super(options);
  }
}
