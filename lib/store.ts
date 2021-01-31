import debug from "debug";

export type StoreState = {
  topic: string | undefined;
  dialog: string | undefined;
  state: { [name: string]: StateValue };
};

export type StateValue = string | number | boolean | {} | undefined | null;

const logger = debug("telegraf-dialog:store");

export class DialogStore {
  private _storage?: {};

  getState(key: string, fallback?: StateValue): StateValue {
    const state = this.store?.state ?? {};
    const result = state[key] ?? fallback;
    logger("get state", { [key]: result });
    return result;
  }

  setState(key: string, value: StateValue): void {
    logger("set state", { [key]: value });
    const state = this.store.state ?? {};
    state[key] = value;
    this.store.state = state;
  }

  get storage(): StoreState {
    return this._storage as StoreState;
  }

  set storage(state: StoreState) {
    this._storage = state;
  }

  get topic(): string | undefined {
    return this.store.topic;
  }

  set topic(id: string | undefined) {
    this.store.topic = id;
  }

  get dialog(): string | undefined {
    return this.store.dialog;
  }

  get state(): any {
    return this.store.state;
  }

  set dialog(id: string | undefined) {
    this.store.dialog = id;
  }

  private get store(): StoreState {
    return (this.storage as any) as StoreState;
  }

  clear() {
    logger("clear store");
    delete this._storage;
  }
}
