import { Service, Inject } from "@kaviar/core";
import { jsonToGraphQLQuery, VariableType } from "json-to-graphql-query";
import { ApolloClient } from "./ApolloClient";
import { gql, DocumentNode } from "@apollo/client/core";
import { EJSON, ObjectId } from "@kaviar/ejson";
import { IEventsMap, QueryBodyType } from "./defs";
import { UpdateQuery } from "mongodb";

type CompiledQueriesTypes = "Count" | "InsertOne" | "UpdateOne" | "DeleteOne";

@Service()
export abstract class Collection<T = any> {
  compiled = new Map<CompiledQueriesTypes, DocumentNode>();

  constructor(
    @Inject(() => ApolloClient)
    protected readonly apolloClient: ApolloClient
  ) {
    this.setupQueries();
  }

  abstract getName(): string;

  /**
   * Insert a single document into the remote database
   * @param document
   */
  async insertOne(document: Partial<T>): Promise<Partial<T>> {
    return this.runCompiledQuery("InsertOne", {
      document,
    });
  }

  /**
   * Update the document
   * @param _id
   * @param modifier The MongoDB modifiers: @url https://docs.mongodb.com/manual/reference/operator/update/
   */
  async updateOne(
    _id: ObjectId | string,
    modifier: UpdateQuery<T>
  ): Promise<Partial<T>> {
    return this.runCompiledQuery("UpdateOne", {
      _id,
      modifier,
    });
  }

  /**
   * Delete a single element by _id from database
   * @param _id
   */
  async deleteOne(_id: ObjectId | string): Promise<boolean> {
    return this.runCompiledQuery("DeleteOne", {
      _id,
    });
  }

  /**
   * Find documents directly from the database
   * @param query
   * @param body
   */
  async find(
    query: IQueryInput,
    body: QueryBodyType<T>
  ): Promise<Partial<T[]>> {
    return this.hybridFind(false, query, body);
  }

  /**
   * Finds and returns a single element
   * @param query
   * @param body
   */
  async findOne(
    query: IQueryInput,
    body: QueryBodyType<T>
  ): Promise<Partial<T>> {
    return this.hybridFind(true, query, body);
  }

  /**
   * Finds and returns a single element
   * @param query
   * @param body
   */
  async findOneById(
    _id: ObjectId | string,
    body: QueryBodyType<T>
  ): Promise<Partial<T>> {
    return this.hybridFind(true, { filters: { _id } }, body);
  }

  /**
   * This simply returns a zen observable that reads messages.
   * XSubscription is the model that handles the dataSet
   * @param body
   * @param options
   */
  subscribe(body: QueryBodyType<T>, options: ISubscriptionOptions = {}) {
    const subscriptionName =
      options.subscription || `${this.getName()}Subscription`;

    return this.apolloClient.subscribe({
      query: gql`
        subscription ${subscriptionName}($body: EJSON) {
          ${subscriptionName}(body: $body) {
            event
            document
          }
        }
      `,
      variables: {
        body: EJSON.stringify(body),
      },
    });
  }

  /**
   * Counts the elements from the database
   * @param filters
   */
  async count(filters: any): Promise<number> {
    return this.runCompiledQuery("Count", {
      filters,
    });
  }

  /**
   * This is used by find() and findOne() to fetch the query
   * @param single
   * @param query
   * @param body
   */
  protected hybridFind(
    single: boolean,
    queryInput: IQueryInput,
    body: object
  ): Promise<any> {
    const operationName = this.getName() + (single ? "FindOne" : "Find");

    const graphQLQuery = {
      query: {
        __variables: {
          query: "QueryInput!",
        },
        [operationName]: Object.assign({}, body, {
          __args: {
            query: new VariableType("query"),
          },
        }),
      },
    };
    return this.apolloClient
      .query({
        query: gql`
          ${jsonToGraphQLQuery(graphQLQuery)}
        `,
        variables: {
          query: {
            filters: queryInput.filters
              ? EJSON.stringify(queryInput.filters)
              : "{}",
            options: queryInput.options ?? {},
          },
        },
      })
      .then((result) => {
        return result.data[operationName];
      });
  }

  /**
   * This function is used to execute a compiled query and return the promise as value
   * @param compiledQuery
   * @param variables
   * @param options
   */
  protected runCompiledQuery(
    compiledQuery: CompiledQueriesTypes,
    variables,
    options = {}
  ) {
    const isMutation = ["InsertOne", "UpdateOne", "DeleteOne"].includes(
      compiledQuery
    );

    if (isMutation) {
      return this.apolloClient
        .mutate({
          mutation: this.compiled.get(compiledQuery),
          variables,
          ...options,
        })
        .then((result) => {
          return result[`${this.getName()}${compiledQuery}`];
        });
    }

    return this.apolloClient
      .query({
        query: this.compiled.get(compiledQuery),
        variables,
        ...options,
      })
      .then((result) => {
        return result[`${this.getName()}${compiledQuery}`];
      });
  }

  /**
   * This compiles the queries so they aren't created each time.
   */
  protected setupQueries() {
    // Mutations
    this.compiled.set(
      "InsertOne",
      gql`
        mutation ${this.getName()}InsertOne($document: EJSON!) {
          ${this.getName()}InsertOne(document: $document) {
            _id
          }
        }
      `
    );
    this.compiled.set(
      "UpdateOne",
      gql`
        mutation ${this.getName()}UpdateOne($_id: ObjectId!, $modifier: EJSON!) {
          ${this.getName()}UpdateOne(_id: $_id, modifier: $modifier) {
            _id
          }
        }
      `
    );
    this.compiled.set(
      "DeleteOne",
      gql`
        mutation ${this.getName()}DeleteOne($_id: ObjectId!) {
          ${this.getName()}DeleteOne(_id: $_id)
        }
      `
    );

    this.compiled.set(
      "Count",
      gql`
        query ${this.getName()}Count($filters: EJSON!) {
          ${this.getName()}Count(filters: $filters)
        }
      `
    );
  }
}

export interface IQueryInput {
  /**
   * MongoDB Filters
   * @url https://docs.mongodb.com/manual/reference/operator/query/
   */
  filters?: {
    [key: string]: any;
  };
  /**
   * MongoDB Options
   */
  options?: IQueryOptionsInput;
}

export interface ISubscriptionOptions extends IEventsMap {
  subscription?: string;
}

export interface IQueryOptionsInput {
  sort?: {
    [key: string]: any;
  };
  limit?: number;
  skip?: number;
}
