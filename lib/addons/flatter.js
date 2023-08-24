import {bot, openai} from '../app.js'
import config from '../config.js'
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
            () => context.sendMessage('你说的对！', extra),
            () => context.sendMessage('对，你说的都对！', extra),
          ])()
        } else {
          const extra = {reply_to_message_id: message.message_id}
          await util.random([
            () => context.sendMessage('虽然不是很明白，但是你说的对！', extra),
            () => context.sendMessage('明白了，你说的太对了！', extra),
          ])()
        }
      },
    )
    .hears(/(竟然|居然|是吧|对吧|对不|真是|真的是|是不是|就好了)/iu, async (context) => {
      try {
        const completion = await openai.chat.completions.create({
          model: config.openai.model,
          messages: [{role: 'user', content: context.message.text}],
        })
        await context.sendMessage(completion.choices[0].message.content)
      } catch {
        await util.random([
          () => context.sendMessage('你说的对！'),
          () => context.sendMessage('对，你说的都对！'),
          () => context.sendSticker('CAADBQADeQ8AAq4QPgXVHuXxE5x9FwI'),
        ])()
      }
    })
    .hears(/(tql|太强了)/iu, async (context) => {
      await util.random([() => context.sendMessage('tql!!!'), () => context.sendMessage('太强了！！！')])()
    })
    .hears(/(twitter\.com|t\.co|sinaimg\.cn|weibo\.cn|b23\.tv)/iu, async (context) => {
      switch (util.dateNow().getUTCDay()) {
        case 0:
        case 6:
          await util.random([
            () => context.sendMessage('hhhh xswl'),
            () => context.sendSticker('CAADBQADBgIAAj3XUhNLZtVI1LrXCwI'),
            () => context.sendSticker('CAADBQADBwIAAj3XUhMfMkH-AgABMAgC'),
            () => context.sendSticker('CAADBQADFgIAAj3XUhMzH5SHrMsKCAI'),
            () => context.sendSticker('CAADBQADKgIAAj3XUhMpmzNkDgkDQgI'),
          ])()
          break
        default:
          await util.random([
            () => context.sendMessage('hhhh xswl'),
            () => context.sendMessage('让我看看是谁又在划水'),
            () => context.sendSticker('CAADBQADBgIAAj3XUhNLZtVI1LrXCwI'),
            () => context.sendSticker('CAADBQADBwIAAj3XUhMfMkH-AgABMAgC'),
            () => context.sendSticker('CAADBQADFgIAAj3XUhMzH5SHrMsKCAI'),
            () => context.sendSticker('CAADBQADKgIAAj3XUhMpmzNkDgkDQgI'),
          ])()
          break
      }
    })
}

export async function run() {}
