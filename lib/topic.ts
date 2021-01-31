import { TelegrafContext } from "telegraf/typings/context";
import { StateValue } from "./store";

export interface TopicContext extends TelegrafContext {
  setState(key: string, value: StateValue): void;
  getState(key: string, defaultValue?: StateValue): StateValue;
  nextTopic(id: string): void;
  leave(): void;
}

export abstract class Topic {
  abstract get id(): string;
  abstract question(ctx: TopicContext): any;
  abstract success(ctx: TopicContext): any;

  failed(ctx: TopicContext): any {
    return;
  }

  async condition(ctx: TopicContext): Promise<boolean> {
    return false;
  }

  help(ctx: TopicContext) {
    return;
  }
}
