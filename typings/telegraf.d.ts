import { Context } from "telegraf";
import DialogHandler from "../lib/handler";

declare module "telegraf" {
  interface Context {
    dialog: DialogHandler;
  }
}
