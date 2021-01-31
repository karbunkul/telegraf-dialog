import debug from "debug";
import { TelegrafContext } from "telegraf/typings/context";
import { DialogStore, StateValue, StoreState } from "./store";
import EventEmitter from "events";
import { Markup } from "telegraf";
import { Topic, TopicContext, Dialog } from "./index";

const logger = debug("telegraf-dialog:handler");

export default class DialogHandler {
  constructor(data: { dialogs: Dialog[]; eventEmitter: EventEmitter }) {
    logger("init handler");
    this._event = data.eventEmitter;
    this.store = new DialogStore();
    data.dialogs.forEach((dialog) => {
      logger("register dialog:", dialog.id);
      this._dialogs.set(dialog.id, dialog);
    });
  }

  private readonly _event: EventEmitter;
  private _dialogs: Map<string, Dialog> = new Map();
  private readonly store: DialogStore;
  private _ctx: TelegrafContext | undefined;

  set ctx(value: TelegrafContext | undefined) {
    this._ctx = value;
  }

  set storage(value: StoreState) {
    this.store.storage = value;
  }

  private dialogById(dialogId?: string): Dialog | undefined {
    return this._dialogs.get(dialogId ?? "");
  }

  public async handle(ctx: TelegrafContext, next: Function) {
    const dialog = this.dialogById(this.store.dialog);
    const topicId = this.store.topic;
    if (dialog && topicId) {
      const topic = this.topicById(dialog, topicId);
      if (topic) {
        const newCtx = this.ctxToTopicContext(ctx);
        const command = ctx.message?.text ?? "";
        const commands = ["/help", "/quit", "/restart", "/retry"];

        if (commands.indexOf(command) !== -1) {
          if (command === "/help") {
            await topic.help(newCtx);
            const parts = [
              "Choose commands:\n",
              "/retry - repeat current topic",
              "/restart - retry all dialog",
              "/quit - terminate current dialog",
            ];

            return await ctx.reply(parts.join("\n"));
          }
          if (command === "/quit") {
            this.leave(true);
            return ctx.reply(
              "Вы прервали процесс",
              Markup.removeKeyboard().extra()
            );
          }

          if (command === "/restart") {
            logger("restart dialog:", dialog.id);
            return this.talk(dialog.id);
          }

          if (command === "/retry") {
            logger("retry topic:", topic.id);
            return newCtx.nextTopic(topic.id);
          }
        }

        const isSuccess = await topic.condition(newCtx);
        if (isSuccess) {
          return topic.success(newCtx);
        } else {
          return topic.failed(newCtx);
        }
      } else {
        throw Error("Unregistered topic");
      }
    } else {
      return next();
    }
  }

  isDialogExist(dialogId: string): boolean {
    return this._dialogs.has(dialogId);
  }

  private ctxToTopicContext(ctx?: TelegrafContext): TopicContext {
    if (ctx !== undefined) {
      (ctx as any).setState = (key: string, value: StateValue) =>
        this.store.setState(key, value);
      (ctx as any).getState = (key: string, defaultValue?: StateValue) =>
        this.store.getState(key, defaultValue);

      (ctx as any).nextTopic = (id: string) => this.nextTopic(id);
      (ctx as any).leave = () => this.leave();
    }
    return ctx as TopicContext;
  }
  // показываем следующий вопрос
  private nextTopic(id: string) {
    const dialog = this.dialogById(this.store.dialog);
    if (dialog) {
      const topic = this.topicById(dialog, id);
      if (topic) {
        this.store.topic = topic.id;
        const ctx = this.ctxToTopicContext(this._ctx);
        return topic.question(ctx);
      } else {
        throw Error("Unregistered topic");
      }
    }
  }

  private leave(reject?: boolean) {
    const dialog = this.dialogById(this.store.dialog);
    if (dialog) {
      if (dialog.onDone != undefined && !reject) {
        logger("leave dialog:", dialog.id);
        dialog.onDone(this.ctxToTopicContext(this._ctx), this.store.state);
      } else {
        logger("reject dialog:", dialog.id);
      }

      this._event.emit("clear");
    }
  }

  private topicById(dialog: Dialog, id: string): Topic | undefined {
    return dialog.topics.find((t) => t.id === id);
  }

  public talk(dialogId: string) {
    if (this.isDialogExist(dialogId)) {
      const dialog = this.dialogById(dialogId);
      if (dialog) {
        logger("start dialog:", dialog.id);
        this.store.dialog = dialogId;
        return this.nextTopic(dialog.initialId);
      }
    } else {
      throw Error("unknown dialog");
    }
  }
}
