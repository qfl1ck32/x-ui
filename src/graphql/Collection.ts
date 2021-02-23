import { Service, Inject, ContainerInstance, Constructor } from "@kaviar/core";
import { jsonToGraphQLQuery, VariableType } from "json-to-graphql-query";
import { ApolloClient } from "./ApolloClient";
import { gql, DocumentNode, FetchPolicy } from "@apollo/client/core";
import { EJSON, ObjectId } from "@kaviar/ejson";
import { IEventsMap, MongoFilterQuery, QueryBodyType } from "./defs";
import { UpdateQuery } from "mongodb";
import { getSideBody } from "./utils/getSideBody";

type CompiledQueriesTypes = "Count" | "InsertOne" | "UpdateOne" | "DeleteOne";

type TransformPartial<T> = Partial<{ [key in keyof T]: any }>;

export type CollectionTransformMap<T> = Partial<
  {
    [key in keyof T]: (value) => any;
  }
>;

export type CollectionLinkConfig<T> = {
  collection: (container) => Constructor<Collection>;
  name: keyof T;
  many?: boolean;
  field?: keyof T;
};

@Service()
export abstract class Collection<T = any> {
  compiled = new Map<CompiledQueriesTypes, DocumentNode>();

  constructor(
    @Inject(() => ApolloClient)
    protected readonly apolloClient: ApolloClient,
    @Inject()
    protected readonly container: ContainerInstance
  ) {
    this.setupQueries();
  }

  abstract getName(): string;

  /**
   * Returns a simple map, and for each field you provide a function which transforms it
   */
  getTransformMap(): CollectionTransformMap<T> {
    return {};
  }

  /**
   * Returns the relations it has with other classes. Might mimick the server, but not necessarily.
   */
  getLinks(): CollectionLinkConfig<T>[] {
    return [];
  }

  /**
   * Transforms the document based on getTransformMap() and getLinks()
   * @param values
   */
  transform(values: TransformPartial<T> | TransformPartial<T>[]) {
    if (!Array.isArray(values)) {
      values = [values];
    }

    this.doTransform(values);
  }

  /**
   * This does the transformation by reading the transform map and also reading through fields
   * We decided to work with arrays to mitigate ContainerInstance abuse when dealing with many documents and relations
   * @param values
   */
  protected doTransform(values: TransformPartial<T>[]): void {
    const map = this.getTransformMap();

    for (const value of values) {
      if (
        map["_id"] === undefined &&
        value["_id"] &&
        typeof value["_id"] === "string"
      ) {
        value["_id"] = new ObjectId(value["_id"]);
      }

      for (const field in map) {
        value[field] = map[field](value[field]);
      }
    }

    for (const relation of this.getLinks()) {
      const collection = this.container.get(
        relation.collection(this.container)
      );

      for (const value of values) {
        if (value[relation.field]) {
          if (relation.many) {
            value[relation.field] = value[relation.field].map(
              (v) => new ObjectId(v)
            );
          } else {
            value[relation.field] = new ObjectId(value[relation.field]);
          }
        }
        if (value[relation.name]) {
          collection.transform(value[relation.name]);
        }
      }
    }
  }

  /**
   * Insert a single document into the remote database
   * @param document
   */
  async insertOne(document: Partial<T>): Promise<Partial<T>> {
    return this.runCompiledQuery("InsertOne", {
      document: EJSON.stringify(document),
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
      modifier: EJSON.stringify(modifier),
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
      filters: EJSON.stringify(filters),
    });
  }

  /**
   * Returns the fetch policy for all queries (find/findOne/count)
   */
  getFetchPolicy(): FetchPolicy {
    return "network-only";
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

    if (queryInput?.options) {
      const sideBody = getSideBody(body);
      if (Object.keys(sideBody).length > 0) {
        queryInput.options.sideBody = EJSON.stringify(sideBody);
      }
    }

    return this.apolloClient
      .query({
        query: gql`
          ${jsonToGraphQLQuery(graphQLQuery, {
            ignoreFields: ["$"],
          })}
        `,
        variables: {
          query: {
            filters: queryInput.filters
              ? EJSON.stringify(queryInput.filters)
              : "{}",
            options: queryInput.options ?? {},
          },
        },
        fetchPolicy: this.getFetchPolicy(),
      })
      .then((result) => {
        const data = JSON.parse(JSON.stringify(result.data[operationName]));
        this.transform(data);

        return data;
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
          return result.data[`${this.getName()}${compiledQuery}`];
        });
    }

    return this.apolloClient
      .query({
        query: this.compiled.get(compiledQuery),
        variables,
        fetchPolicy: this.getFetchPolicy(),
        ...options,
      })
      .then((result) => {
        return result.data[`${this.getName()}${compiledQuery}`];
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

export interface IQueryInput<T = null> {
  /**
   * MongoDB Filters
   * @url https://docs.mongodb.com/manual/reference/operator/query/
   */
  filters?: T extends null
    ? {
        [key: string]: any;
      }
    : MongoFilterQuery<T>;
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
  sideBody?: QueryBodyType;
}
