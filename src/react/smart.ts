import { Service } from "@kaviar/core";
import { Smart as BaseSmart, smart, newSmart, useSmart } from "@kaviar/smart";

@Service({
  transient: true,
})
export class Smart<S, C> extends BaseSmart<S, C> {}

export { smart, newSmart, useSmart };
