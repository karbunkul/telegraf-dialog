import { Topic, TopicContext } from "./topic";

export abstract class Dialog {
  abstract get id(): string;
  abstract get initialId(): string;
  abstract get topics(): Topic[];
  abstract onDone(ctx: TopicContext, state: any): any;
}
