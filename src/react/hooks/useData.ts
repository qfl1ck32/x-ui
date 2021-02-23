import { useState, useEffect } from "react";
import { Constructor } from "@kaviar/core";
import { Collection, IQueryInput } from "../../graphql/Collection";
import { use } from "./use";
import { QueryBodyType } from "../../graphql/defs";
import { ObjectId } from "@kaviar/ejson";

export type UseDataStateType<T> = {
  data: T | null;
  error: string;
  isLoading: boolean;
};

/**
 * Use this when you want to easily fetch data with hooks for multiple documents
 */
export function useData<T>(
  collectionClass: Constructor<Collection<T>>,
  queryOptions: IQueryInput<T> = {},
  body: QueryBodyType<T>
  // options: QueryOp = {},
): UseDataStateType<Partial<T>[]> {
  const collection = use(collectionClass);
  const [dataState, setDataState] = useState<UseDataStateType<Partial<T>[]>>({
    data: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    collection
      .find(queryOptions, body)
      .then((documents) => {
        setDataState({
          data: documents,
          isLoading: false,
          error: null,
        });
      })
      .catch((err) => {
        setDataState({
          data: null,
          isLoading: false,
          error: err.toString(),
        });
      });
  }, []);

  return dataState;
}

/**
 * Use this when you want to easily fetch data with hooks for multiple documents
 */
export function useDataOne<T>(
  collectionClass: Constructor<Collection<T>>,
  _id: any,
  body: QueryBodyType<T>
  // options: QueryOp = {},
): UseDataStateType<Partial<T>> {
  const filters = { _id };
  if (typeof _id === "string") {
    filters._id = new ObjectId(_id);
  }
  const collection = use(collectionClass);
  const [dataState, setDataState] = useState<UseDataStateType<Partial<T>>>({
    data: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    collection
      .findOne({ filters }, body)
      .then((document) => {
        setDataState({
          data: document,
          error: null,
          isLoading: false,
        });
      })
      .catch((err) => {
        setDataState({
          data: null,
          error: err.toString(),
          isLoading: false,
        });
      });
  }, []);

  return dataState;
}
