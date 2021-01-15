import { Inject } from "@kaviar/core";
import { Smart } from "@kaviar/smart";
import { ApolloClient } from "../../graphql/ApolloClient";

export interface IUser {}

export class Guardian extends Smart<{
  token: string;
  user: IUser;
}> {
  @Inject()
  protected readonly apolloClient: ApolloClient;

  state = {
    token: null,
    user: null,
  };

  getUser() {}

  setToken(token) {
    this.updateState({ token });
  }

  login(username, password) {}
}
