import {bot} from '../app.js'
import * as util from '../util.js'

export async function command() {
  return []
}

export async function scene() {
  return []
}

export async function setup() {
  bot
    .mention(
      (value, context) => value == `@${context.me}`,
      async (context) => {
        const {message} = context
        const {reply_to_message} = message
        if (reply_to_message) {
          const extra = {reply_to_message_id: reply_to_message.message_id}
          await util.random([
            () => context.reply('你说的对！', extra),
            () => context.reply('对，你说的都对！', extra),
          ])()
        } else {
          const extra = {reply_to_message_id: message.message_id}
          await util.random([
            () => context.reply('虽然不是很明白，但是你说的对！', extra),
            () => context.reply('明白了，你说的太对了！', extra),
          ])()
        }
      }
    )
    .hears(/(竟然|居然|是吧|对吧|对不|真是|真的是|是不是|就好了)/iu, async (context) => {
      await util.random([
        () => context.reply('你说的对！'),
        () => context.reply('对，你说的都对！'),
        () => context.replyWithSticker('CAADBQADeQ8AAq4QPgXVHuXxE5x9FwI'),
      ])()
    })
    .hears(/(tql|太强了)/iu, async (context) => {
      await util.random([() => context.reply('tql!!!'), () => context.reply('太强了！！！')])()
    })
    .hears(/(twitter\.com|t\.co|sinaimg\.cn|weibo\.cn|b23\.tv)/iu, async (context) => {
      switch (util.dateNow().getUTCDay()) {
        case 0:
        case 6:
          await util.random([
            () => context.reply('hhhh xswl'),
            () => context.replyWithSticker('CAADBQADBgIAAj3XUhNLZtVI1LrXCwI'),
            () => context.replyWithSticker('CAADBQADBwIAAj3XUhMfMkH-AgABMAgC'),
            () => context.replyWithSticker('CAADBQADFgIAAj3XUhMzH5SHrMsKCAI'),
            () => context.replyWithSticker('CAADBQADKgIAAj3XUhMpmzNkDgkDQgI'),
          ])()
          break
        default:
          await util.random([
            () => context.reply('hhhh xswl'),
            () => context.reply('让我看看是谁又在划水'),
            () => context.replyWithSticker('CAADBQADBgIAAj3XUhNLZtVI1LrXCwI'),
            () => context.replyWithSticker('CAADBQADBwIAAj3XUhMfMkH-AgABMAgC'),
            () => context.replyWithSticker('CAADBQADFgIAAj3XUhMzH5SHrMsKCAI'),
            () => context.replyWithSticker('CAADBQADKgIAAj3XUhMpmzNkDgkDQgI'),
          ])()
          break
      }
    })
}

export async function run() {}
