import * as util from '../util.js'

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {import('redis').RedisClient} store
 * @returns {() => void}
 */
// eslint-disable-next-line no-unused-vars
export default function (bot, store) {
  bot.mention(
    (value, context) => value == `@${context.me}`,
    (context) => {
      const {message} = context
      const {reply_to_message} = message
      if (reply_to_message) {
        const extra = {
          reply_to_message_id: reply_to_message.message_id,
        }
        util.random([() => context.reply('你说的对！', extra), () => context.reply('对，你说的都对！', extra)])()
      } else {
        const extra = {
          reply_to_message_id: message.message_id,
        }
        util.random([
          () => context.reply('虽然不是很明白，但是你说的对！', extra),
          () => context.reply('明白了，你说的太对了！', extra),
        ])()
      }
    }
  )
  bot.hears(/(竟然|居然|对吧|真是|真的是|是不是)/iu, (context) => {
    util.random([
      () => context.reply('你说的对！'),
      () => context.reply('对，你说的都对！'),
      () => context.replyWithSticker('CAADBQADeQ8AAq4QPgXVHuXxE5x9FwI'),
    ])()
  })
  bot.hears(/(tql|太强了)/iu, (context) => {
    util.random([() => context.reply('tql!!!'), () => context.reply('太强了！！！')])()
  })
  bot.hears(/(twitter\.com|t\.co|sinaimg\.cn|weibo\.cn|b23\.tv)/iu, (context) => {
    switch (util.dateNow().getUTCDay()) {
      case 0:
      case 6:
        util.random([
          () => context.reply('hhhh xswl'),
          () => context.replyWithSticker('CAADBQADBgIAAj3XUhNLZtVI1LrXCwI'),
          () => context.replyWithSticker('CAADBQADBwIAAj3XUhMfMkH-AgABMAgC'),
          () => context.replyWithSticker('CAADBQADFgIAAj3XUhMzH5SHrMsKCAI'),
          () => context.replyWithSticker('CAADBQADKgIAAj3XUhMpmzNkDgkDQgI'),
        ])()
        break
      default:
        util.random([
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
  return () => {}
}
