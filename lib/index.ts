import debug from "debug";
import { Context } from "telegraf";
import events from "events";
import DialogHandler from "./handler";
import { Dialog } from "./dialog";

const logger = debug("telegraf-dialog:middleware");

export { Dialog } from "./dialog";
export { Topic, TopicContext } from "./topic";

export default function (opts: {
  dialogs: Dialog[];
  storeKey?: string;
  namespace: string;
}) {
  const eventEmitter = new events.EventEmitter();

  const dialogHandler = new DialogHandler({
    dialogs: opts.dialogs,
    eventEmitter,
  });

  return async (ctx: Context, next: Function) => {
    const storeKey = `telegraf_dialog: ${opts.namespace}`;
    const session: any = (ctx as any)[opts.storeKey ?? "session"];

    if (!session.hasOwnProperty(storeKey)) {
      logger("store key", storeKey);
      session[storeKey] = {};
      logger("init store");
    }
    dialogHandler.storage = session[storeKey];
    eventEmitter.once("clear", () => {
      session[storeKey] = {};
    });

    ctx.dialog = dialogHandler;
    dialogHandler.ctx = ctx;
    return dialogHandler.handle(ctx, next);
  };
}
