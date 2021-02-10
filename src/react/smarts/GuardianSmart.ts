import * as React from "react";
import { EventManager, Inject, Event } from "@kaviar/core";
import { gql } from "@apollo/client";
import { Smart } from "@kaviar/smart";
import { LOCAL_STORAGE_TOKEN_KEY } from "../../constants";
import { ApolloClient } from "../../graphql/ApolloClient";
import { UserLoggedOutEvent } from "../../events/UserSecurityEvents";
import {
  UserLoggedInEvent,
  AuthenticationTokenUpdateEvent,
} from "../../events";

type State<UserType = DefaultUserType> = {
  /**
   * This represents the fact that we're currently fetching for the user data
   */
  fetchingUserData: boolean;
  /**
   * This marks if the user is successfully marked as logged in
   */
  isLoggedIn: boolean;
  /**
   * When the user has an expired token or one that couldn't retrieve the user
   */
  hasInvalidToken: boolean;
  user: UserType;
  /**
   * This is done the first time when the token is read and user is fetched. After that it will stay initialised.
   */
  initialised: boolean;
};

const GuardianContext = React.createContext(null);

interface IUserMandatory {
  _id: string | object | number;
  roles: string[];
}

type DefaultUserType = {
  _id: string | object | number;
  profile: {
    firstName: string;
    lastName: string;
  };
  roles: string[];
  email: string;
};

type DefaultUserRegistrationType = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export class GuardianSmart<
  TUserType extends IUserMandatory = DefaultUserType,
  TUserRegistrationType = DefaultUserRegistrationType
> extends Smart<State<TUserType>, any> {
  protected authenticationToken: string;

  state: State<TUserType> = {
    fetchingUserData: false,
    isLoggedIn: false,
    hasInvalidToken: false,
    user: null,
    initialised: false,
  };

  @Inject()
  apolloClient: ApolloClient;

  @Inject()
  eventManager: EventManager;

  async init() {
    this.load()
      .then(() => {
        this.updateState({
          initialised: true,
        });
      })
      .catch(() => {
        this.updateState({
          initialised: true,
        });
      });
  }

  protected async load() {
    await this.retrieveToken();

    if (!this.authenticationToken) {
      // Nothing to do without a token
      return;
    }

    this.updateState({
      fetchingUserData: true,
    });
    if (this.authenticationToken) {
      this.updateState({ fetchingUserData: true });
      this.retrieveUser()
        .then((user) => {
          this.updateState({
            user,
            isLoggedIn: true,
            hasInvalidToken: false,
            fetchingUserData: false,
          });
        })
        .catch((err) => {
          this.storeToken(null);
          this.updateState({
            hasInvalidToken: true,
            fetchingUserData: false,
            isLoggedIn: false,
          });
        });
    }
  }

  protected retrieveUser(): Promise<TUserType> {
    return this.apolloClient
      .query({
        query: gql`
          query me {
            me {
              _id
              email
              profile {
                firstName
                lastName
              }
              roles
            }
          }
        `,
        fetchPolicy: "network-only",
      })
      .then((response) => {
        return response.data.me;
      });
  }

  protected async retrieveToken() {
    this.authenticationToken =
      localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY) || null;
    await this.eventManager.emit(
      new AuthenticationTokenUpdateEvent({ token: this.authenticationToken })
    );
  }

  protected async storeToken(token: string | null) {
    await this.eventManager.emit(new AuthenticationTokenUpdateEvent({ token }));

    if (token === null) {
      localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
    } else {
      localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, token);
    }
  }

  getToken() {
    return this.authenticationToken;
  }

  login(username: string, password: string) {
    this.updateState({
      hasInvalidToken: false,
    });

    return this.apolloClient
      .mutate({
        mutation: gql`
          mutation login($input: LoginInput!) {
            login(input: $input) {
              token
            }
          }
        `,
        variables: {
          input: {
            username,
            password,
          },
        },
      })
      .then(async (response) => {
        const { token } = response.data.login;
        await this.eventManager.emit(new UserLoggedInEvent({ token }));

        // We await this as storing the token might be blocking
        await this.storeToken(token);
        // This can be done in background
        this.load();

        return token;
      });
  }

  /**
   * Registers and returns the token if the user isn't required to verify the email first
   * @param user
   */
  register(user: TUserRegistrationType): Promise<string | null> {
    return this.apolloClient
      .mutate({
        mutation: gql`
          mutation register($input: RegistrationInput!) {
            register(input: $input) {
              token
            }
          }
        `,
        variables: {
          input: user,
        },
      })
      .then((response) => {
        const { token } = response.data.register;
        if (token) {
          this.storeToken(token);
        }

        return token;
      });
  }

  verifyEmail(emailToken: string): Promise<string> {
    return this.apolloClient
      .mutate({
        mutation: gql`
          mutation verifyEmail($input: VerifyEmailInput!) {
            verifyEmail(input: $input) {
              token
            }
          }
        `,
        variables: {
          input: {
            token: emailToken,
          },
        },
      })
      .then(async (response) => {
        const { token } = response.data.verifyEmail;
        await this.storeToken(token);

        return token;
      });
  }

  forgotPassword(email: string): Promise<void> {
    return this.apolloClient
      .mutate({
        mutation: gql`
          mutation forgotPassword($input: ForgotPasswordInput!) {
            forgotPassword(input: $input)
          }
        `,
        variables: {
          input: {
            email,
          },
        },
      })
      .then((response) => {
        return;
      });
  }

  resetPassword(
    username: string,
    token: string,
    newPassword: string
  ): Promise<string> {
    return this.apolloClient
      .mutate({
        mutation: gql`
          mutation resetPassword($input: ResetPasswordInput!) {
            resetPassword(input: $input) {
              token
            }
          }
        `,
        variables: {
          input: {
            username,
            token,
            newPassword,
          },
        },
      })
      .then((response) => {
        const { token } = response.data.resetPassword;
        this.storeToken(token);

        return token;
      });
  }

  /**
   * Changes the password of the current user
   * @param oldPassword
   * @param newPassword
   */
  changePassword(oldPassword: string, newPassword: string): Promise<void> {
    return this.apolloClient
      .mutate({
        mutation: gql`
          mutation changePassword($input: ChangePasswordInput!) {
            changePassword(input: $input)
          }
        `,
        variables: {
          input: {
            oldPassword,
            newPassword,
          },
        },
      })
      .then((response) => {
        return;
      });
  }

  /**
   * Logs the user out and cleans up the tokens
   */
  logout(): Promise<void> {
    return this.apolloClient
      .mutate({
        mutation: gql`
          mutation logout {
            logout
          }
        `,
      })
      .then(async () => {
        const { _id } = this.state.user;
        await this.eventManager.emit(
          new UserLoggedOutEvent({
            userId: _id,
          })
        );
        await this.storeToken(null);
        this.updateState({
          isLoggedIn: false,
          user: null,
          fetchingUserData: false,
        });
        return;
      });
  }

  hasRole(role: string): boolean {
    return this.state.user?.roles?.includes(role);
  }

  static getContext() {
    return GuardianContext;
  }
}
