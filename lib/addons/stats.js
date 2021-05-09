import * as util from '../util.js'
import {Scenes} from 'telegraf'

/**
 * @param {import('telegraf').Telegraf} bot
 * @param {import('redis').RedisClient} store
 * @returns {() => void}
 */
export default function (bot, store) {
  bot.on('message', (context, next) => {
    const user = context.from.id
    const channel = context.chat.id
    store.hset(util.key('username'), user, context.from.username)
    switch (context.chat.type) {
      case 'group':
      case 'supergroup':
        store.sadd(util.key('channel'), channel)
        store.hincrby(util.key('message', channel), user, 1)
        if (context.message.sticker) {
          store.hincrby(util.key('sticker', channel), user, 1)
        }
        break
    }
    next()
  })
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
              day = util.dateDay(util.dateNow())
            } else if ((match = text.match(/明天/))) {
              day = util.dateDay(util.dateOffset(util.dateNow(), +1))
            } else if ((match = text.match(/昨天/))) {
              day = util.dateDay(util.dateOffset(util.dateNow(), -1))
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
              store.hset(util.key('birthday'), user, util.dayString(day))
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
  return async () => {
    for (;;) {
      const today = util.dateNow()
      const scheduleTime = util.dateOrigin(util.dateOffset(today, +1)).getTime()
      for (;;) {
        const waitTime = scheduleTime - util.dateNow().getTime()
        if (waitTime < 0) break
        await util.timeout(Math.max(waitTime, 1000))
      }
      const channels = (await store.smembers('channel')) || []
      for (const channel of channels) {
        const messageCount = (await store.hgetall(util.key('message', channel))) || {}
        const users = Object.keys(messageCount)
        if (!users.length) continue
        const stickerCount = (await store.hgetall(util.key('sticker', channel))) || {}
        const usernames = (await store.hmget(util.key('username'), users)) || []
        const birthdays = (await store.hmget(util.key('birthday'), users)) || []
        const stats = users.map((user, index) => ({
          username: usernames[index] || '',
          messageCount: parseInt(messageCount[user]) || 0,
          stickerCount: parseInt(stickerCount[user]) || 0,
          isBirthday: birthdays[index] == util.dayString(util.dateDay(today)),
          upcomingBirthday: birthdays[index] == util.dayString(util.dateDay(util.dateOffset(today, +1))),
        }))
        stats.forEach((item) => {
          item.textCount = item.messageCount - item.stickerCount
        })
        const text = [
          `📅本群日报 - ${util.dateString(today)}`,
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
                  strings.push(util.random(emoji2))
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
        const usersWithUpcomingBirthday = stats
          .filter((item) => item.upcomingBirthday)
          .map((item) => `@${item.username}`)
        if (usersWithUpcomingBirthday.length) {
          await util.timeout(1000)
          await bot.telegram.sendMessage(channel, `🎉${usersWithUpcomingBirthday} 要过生日了！🎉`)
          await bot.telegram.sendSticker(channel, 'CAADAwADLAADwzqBCUqnLyWgE1T4Ag')
        }
        await store.del([util.key('message', channel), util.key('sticker', channel)])
      }
    }
  }
}
