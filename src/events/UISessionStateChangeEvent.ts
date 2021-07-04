import { Event } from "@kaviar/core";
import { IUISessionStore } from "../react/services/UISession.service";

export interface IUISessionStateChangeEvent {
  fieldName: keyof IUISessionStore;
  value: IUISessionStore[keyof IUISessionStore];
}

export class UISessionStateChangeEvent extends Event<IUISessionStateChangeEvent> {}
