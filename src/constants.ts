import { Token } from "@kaviar/core";
import { IXUIBundleConfig } from "./defs";

export const XUI_CONFIG_TOKEN = new Token<IXUIBundleConfig>("XUI_CONFIG");
export const APOLLO_CLIENT_OPTIONS_TOKEN = new Token("APOLLO_CLIENT_OPTIONS");
export const LOCAL_STORAGE_TOKEN_KEY = "kaviar-token";
