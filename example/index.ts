import RedisSession from "telegraf-session-redis";
import Telegraf, { Markup } from "telegraf";
import dialog, { Topic, TopicContext, Dialog } from "../lib/index";

const token: string = process.env["BOT_TOKEN"] ?? "";
const bot = new Telegraf(token);

bot.use(new RedisSession({ store: { host: "localhost", port: 6379 } }));

enum ExampleDialogId {
  confirm = "confirm",
}

class ExampleDialog extends Dialog {
  get id(): string {
    return "example_dialog";
  }

  get initialId(): string {
    return ExampleDialogId.confirm;
  }

  get topics(): Topic[] {
    return [
      new TopicConfirm({
        id: ExampleDialogId.confirm,
        key: "confirm",
        yes: "Да",
        no: "Нет",
        message: "Вы уверены что это работает?",
        failed: "Выберите Да или Нет",
      }),
    ];
  }

  onDone(ctx: TopicContext, state: any) {
    const { confirm } = state;
    const message =
      confirm === "yes"
        ? "Спасибо за ваш выбор"
        : "Ну нет, так нет - это ваш выбор";
    return ctx.reply(message, Markup.removeKeyboard().extra());
  }
}

class TopicConfirm extends Topic {
  constructor(opts: {
    id: string;
    nextId?: string;
    key: string;
    message: string;
    failed?: string;
    yes?: string;
    no?: string;
  }) {
    super();
    this.id = opts.id;
    this.nextId = opts.nextId;
    this.key = opts.key;
    this.message = opts.message;
    this.fail = opts.failed;
    this.yes = opts.yes ?? "Yes";
    this.no = opts.no ?? "No";
  }

  readonly id: string;
  readonly nextId?: string;
  readonly key: string;
  readonly message: string;
  readonly fail?: string;
  readonly yes: string;
  readonly no: string;

  async question(ctx: TopicContext): Promise<void> {
    await ctx.reply(
      this.message,
      Markup.inlineKeyboard([
        [
          Markup.callbackButton(this.yes, "yes"),
          Markup.callbackButton(this.no, "no"),
        ],
      ]).extra()
    );
  }

  get availableAnswer() {
    return [...this.positiveAnswer, ...this.negativeAnswer];
  }

  get positiveAnswer() {
    return [this.yes.toLowerCase(), "yes", "y"];
  }

  get negativeAnswer() {
    return [this.no.toLowerCase(), "no", "n"];
  }

  success(ctx: TopicContext): any {
    const message = ctx.callbackQuery?.data ?? ctx.message?.text ?? "";
    const answer =
      this.positiveAnswer.indexOf(message.toLowerCase()) !== -1 ? "yes" : "no";

    ctx.setState(this.key, answer);

    if (this.nextId === undefined) ctx.leave();
  }

  async failed(ctx: TopicContext): Promise<any> {
    if (this.fail !== undefined) {
      if (ctx.getState("isNotice", false) === false) {
        await ctx.reply(
          this.fail,
          Markup.keyboard([[Markup.button(this.yes), Markup.button(this.no)]])
            .resize(true)
            .oneTime(true)
            .extra()
        );
        ctx.setState("isNotice", true);
      }
    }
  }

  async condition(ctx: TopicContext): Promise<boolean> {
    if (
      ctx.message?.text !== undefined &&
      this.availableAnswer.indexOf(ctx.message?.text.toLowerCase()) !== -1
    ) {
      return true;
    } else {
      return ctx.callbackQuery?.id != undefined;
    }
  }
}

bot.use(
  dialog({
    dialogs: [new ExampleDialog()],
    namespace: "nodejs-debug",
  })
);

bot.command("start", (ctx) => {
  return ctx.dialog.talk("example_dialog");
});

bot.launch().then(() => {
  console.log("bot is launched");
});
