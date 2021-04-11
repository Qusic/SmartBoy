import {Telegraf, Scenes} from 'telegraf'
import Redis from 'redis'
import util from 'util'

const {TOKEN, REDIS} = process.env
const bot = new Telegraf(TOKEN)
const store = Redis.createClient(REDIS)
for (const method of [
  'get',
  'set',
  'mget',
  'mset',
  'del',
  'hget',
  'hmget',
  'hgetall',
  'hset',
  'hincrby',
  'sadd',
  'smembers',
  'quit',
]) {
  store[method] = util.promisify(store[method])
}

const key = (...parts) => parts.filter((part) => part).join(':')
const timeout = util.promisify(setTimeout)
const random = (array) => array[Math.floor(Math.random() * array.length)]
const timezone = 8 * 60 * 60 * 1000
const dateNow = () => new Date(Date.now() + timezone)
const dateDay = (date) => [date.getUTCMonth(), date.getUTCDate()]
const dateString = (date) =>
  [
    `${date.getUTCFullYear()}年`,
    `${date.getUTCMonth() + 1}月`,
    `${date.getUTCDate()}日`,
    `星期${[...'日一二三四五六'][date.getUTCDay()]}`,
  ].join('')
const dayString = (day) =>
  [day[0].toString().slice(-2).padStart(2, '0'), day[1].toString().slice(-2).padStart(2, '0')].join('')
const dateOffset = (date, offset) => {
  date = new Date(date.getTime())
  date.setUTCDate(date.getUTCDate() + offset)
  return date
}
const dateOrigin = (date) => {
  date = new Date(date.getTime())
  date.setUTCHours(0)
  date.setUTCMinutes(0)
  date.setUTCSeconds(0)
  date.setUTCMilliseconds(0)
  return date
}

bot.on('message', (context, next) => {
  const user = context.from.id
  const channel = context.chat.id
  store.hset(key('username'), user, context.from.username)
  switch (context.chat.type) {
    case 'group':
    case 'supergroup':
      store.sadd(key('channel'), channel)
      store.hincrby(key('message', channel), user, 1)
      if (context.message.sticker) {
        store.hincrby(key('sticker', channel), user, 1)
      }
      break
  }
  next()
})

bot.mention(
  (value, context) => value == `@${context.me}`,
  (context) => {
    const {message} = context
    const {reply_to_message} = message
    if (reply_to_message) {
      const extra = {
        reply_to_message_id: reply_to_message.message_id,
      }
      random([() => context.reply('你说的对！', extra), () => context.reply('对，你说的都对！', extra)])()
    } else {
      const extra = {
        reply_to_message_id: message.message_id,
      }
      random([
        () => context.reply('虽然不是很明白，但是你说的对！', extra),
        () => context.reply('明白了，你说的太对了！', extra),
      ])()
    }
  }
)

bot.use(
  new Scenes.Stage(
    [
      (() => {
        const scene = new Scenes.BaseScene('birthday')
        scene.enter((context) => {
          const user = context.from.id
          const text = context.message.text
          let day = null,
            match = null
          if (
            (match = text.match(/(\d{1,2})[.-月](\d{1,2})/)) &&
            match[1] >= 1 &&
            match[1] <= 12 &&
            match[2] >= 1 &&
            match[2] <= 31
          ) {
            day = [match[1] - 1, match[2]]
          } else if ((match = text.match(/今天/))) {
            day = dateDay(dateNow())
          } else if ((match = text.match(/明天/))) {
            day = dateDay(dateOffset(dateNow(), +1))
          } else if ((match = text.match(/昨天/))) {
            day = dateDay(dateOffset(dateNow(), -1))
          } else {
            context.scene.leave()
            return
          }
          context.scene.state = {user, day}
          context.reply(`你的生日是${day[0] + 1}月${day[1]}日吗，要不要我记一下？`, {
            reply_to_message_id: context.message.message_id,
          })
        })
        scene.leave((context) => {
          const {user, day, save} = context.scene.state
          if (save) {
            store.hset(key('birthday'), user, dayString(day))
          }
        })
        scene.hears(/(yes|ok|是|好|谢)/iu, (context) => {
          context.reply('好！！')
          context.replyWithSticker('CAADBQADJQIAAj3XUhOdvdmFk1hX9QI')
          context.scene.state.save = true
          context.scene.leave()
        })
        scene.hears(/(no|否|不|别)/iu, (context) => {
          context.reply('噫，好吧')
          context.replyWithSticker('CAADBQADKgIAAj3XUhMpmzNkDgkDQgI')
          context.scene.leave()
        })
        scene.on('message', (context) => {
          context.scene.leave()
        })
        return scene
      })(),
    ],
    {ttl: 15}
  ).middleware()
)
bot.hears(/生日/iu, (context) => context.scene.enter('birthday'))

bot.hears(/(竟然|居然|对吧|真是|真的是|是不是)/iu, (context) => {
  random([
    () => context.reply('你说的对！'),
    () => context.reply('对，你说的都对！'),
    () => context.replyWithSticker('CAADBQADeQ8AAq4QPgXVHuXxE5x9FwI'),
  ])()
})
bot.hears(/(tql|太强了)/iu, (context) => {
  random([() => context.reply('tql!!!'), () => context.reply('太强了！！！')])()
})
bot.hears(/(twitter\.com|t\.co|sinaimg\.cn|weibo\.cn|b23\.tv)/iu, (context) => {
  switch (dateNow().getUTCDay()) {
    case 0:
    case 6:
      random([
        () => context.reply('hhhh xswl'),
        () => context.replyWithSticker('CAADBQADBgIAAj3XUhNLZtVI1LrXCwI'),
        () => context.replyWithSticker('CAADBQADBwIAAj3XUhMfMkH-AgABMAgC'),
        () => context.replyWithSticker('CAADBQADFgIAAj3XUhMzH5SHrMsKCAI'),
        () => context.replyWithSticker('CAADBQADKgIAAj3XUhMpmzNkDgkDQgI'),
      ])()
      break
    default:
      random([
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

async function runloop() {
  for (;;) {
    const today = dateNow()
    const scheduleTime = dateOrigin(dateOffset(today, +1)).getTime()
    for (;;) {
      const waitTime = scheduleTime - dateNow().getTime()
      if (waitTime < 0) break
      await timeout(Math.max(waitTime, 1000))
    }

    const channels = (await store.smembers('channel')) || []
    for (const channel of channels) {
      const messageCount = (await store.hgetall(key('message', channel))) || {}
      const users = Object.keys(messageCount)
      if (!users.length) continue
      const stickerCount = (await store.hgetall(key('sticker', channel))) || {}
      const usernames = (await store.hmget(key('username'), users)) || []
      const birthdays = (await store.hmget(key('birthday'), users)) || []
      const stats = users.map((user, index) => ({
        username: usernames[index] || '',
        messageCount: parseInt(messageCount[user]) || 0,
        stickerCount: parseInt(stickerCount[user]) || 0,
        isBirthday: birthdays[index] == dayString(dateDay(today)),
        upcomingBirthday: birthdays[index] == dayString(dateDay(dateOffset(today, +1))),
      }))
      stats.forEach((item) => {
        item.textCount = item.messageCount - item.stickerCount
      })

      const text = [
        `📅本群日报 - ${dateString(today)}`,
        ...stats
          .filter((item) => item.messageCount > 0)
          .sort((item1, item2) => item2.textCount - item1.textCount || item2.stickerCount - item1.stickerCount)
          .map((item, index) => {
            const strings = []
            if (item.isBirthday) {
              strings.push('🎂')
            } else {
              const emoji1 = [...'🥇🥈🥉']
              const emoji2 = [...'😀🙂😗😐']
              if (index < emoji1.length) {
                strings.push(emoji1[index])
              } else {
                strings.push(random(emoji2))
              }
            }
            strings.push(`@${item.username}:`)
            strings.push(` ${item.textCount}条消息`)
            strings.push(`+${item.stickerCount}个表情`)
            if (item.isBirthday) {
              strings.push(' 生日快乐！')
            }
            return strings.join('')
          }),
      ].join('\n')
      await bot.telegram.sendMessage(channel, text)

      const usersWithUpcomingBirthday = stats.filter((item) => item.upcomingBirthday).map((item) => `@${item.username}`)
      if (usersWithUpcomingBirthday.length) {
        await timeout(1000)
        await bot.telegram.sendMessage(channel, `🎉${usersWithUpcomingBirthday} 要过生日了！🎉`)
        await bot.telegram.sendSticker(channel, 'CAADAwADLAADwzqBCUqnLyWgE1T4Ag')
      }

      await store.del([key('message', channel), key('sticker', channel)])
    }
  }
}

bot.launch().then(async () => {
  for (const event of ['SIGINT', 'SIGTERM']) {
    process.once(event, async () => {
      bot.stop(event)
      await store.quit()
    })
  }
  await runloop()
})
