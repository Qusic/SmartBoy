import {Scenes} from 'telegraf'
import format from 'telegraf/format'

import {bot, store} from '../app.js'
import * as util from '../util.js'

export async function command() {
  return []
}

export async function scene() {
  return [
    new Scenes.BaseScene('birthday')
      .enter(async (context) => {
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
          await context.scene.leave()
          return
        }
        context.scene.state = {user, day}
        await context.reply(`你的生日是${day[0] + 1}月${day[1]}日吗，要不要我记一下？`)
      })
      .leave(async (context) => {
        const {user, day, save} = context.scene.state
        if (save) {
          store.data.stats.birthday[user] = util.dayString(day)
          await store.write()
        }
      })
      .hears(/(yes|ok|好|谢|(?<!不)是|(?<!不)要)/iu, async (context) => {
        context.scene.state.save = true
        await context.reply('好！！')
        await context.sendSticker('CAADBQADJQIAAj3XUhOdvdmFk1hX9QI')
        await context.scene.leave()
      })
      .hears(/(no|否|不|别)/iu, async (context) => {
        await context.reply('噫，好吧')
        await context.sendSticker('CAADBQADKgIAAj3XUhMpmzNkDgkDQgI')
        await context.scene.leave()
      })
      .on('message', async (context) => {
        await context.scene.leave()
      }),
  ]
}

export async function setup() {
  store.data.stats ||= {}
  store.data.stats.username ||= {}
  store.data.stats.birthday ||= {}
  store.data.stats.count ||= {}
  bot
    .on('message', async (context, next) => {
      const user = context.from.id
      const chat = context.chat.id
      store.data.stats.username[user] = util.displayName(context.from)
      if (!context.from.is_bot && ['group', 'supergroup'].includes(context.chat.type)) {
        store.data.stats.count[chat] ||= {}
        store.data.stats.count[chat][user] ||= {}
        store.data.stats.count[chat][user].message ||= 0
        store.data.stats.count[chat][user].message += 1
        if (context.message.sticker) {
          store.data.stats.count[chat][user].sticker ||= 0
          store.data.stats.count[chat][user].sticker += 1
        }
      }
      await store.write()
      await next()
    })
    .hears(/生日/iu, async (context) => {
      await context.scene.enter('birthday')
    })
}

export async function run() {
  for (;;) {
    const today = util.dateNow()
    const scheduleTime = util.dateOrigin(util.dateOffset(today, +1)).getTime()
    for (;;) {
      const waitTime = scheduleTime - util.dateNow().getTime()
      if (waitTime < 0) break
      await util.timeout(Math.max(waitTime, 1000))
    }
    const chats = Object.keys(store.data.stats.count)
    for (const chat of chats) {
      const users = Object.keys(store.data.stats.count[chat])
      if (!users.length) continue
      const stats = users.map((user) => ({
        user: Number(user),
        username: store.data.stats.username[user] || '',
        messageCount: store.data.stats.count[chat][user].message || 0,
        stickerCount: store.data.stats.count[chat][user].sticker || 0,
        birthdayToday: store.data.stats.birthday[user] == util.dayString(util.dateDay(today)),
        birthdayTomorrow: store.data.stats.birthday[user] == util.dayString(util.dateDay(util.dateOffset(today, +1))),
      }))
      stats.forEach((item) => {
        item.textCount = item.messageCount - item.stickerCount
      })
      const statText = format.join(
        [
          `📅本群日报 - ${util.dateString(today)}`,
          ...stats
            .filter((item) => item.messageCount > 0)
            .sort((item1, item2) => item2.textCount - item1.textCount || item2.stickerCount - item1.stickerCount)
            .map((item, index) => {
              const strings = []
              if (item.birthdayToday) {
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
              strings.push(format.fmt`${format.mention(`@${item.username}`, item.user)}:`)
              strings.push(` ${item.textCount}条消息`)
              strings.push(`+${item.stickerCount}个表情`)
              if (item.birthdayToday) strings.push(' 生日快乐！')
              return format.join(strings)
            }),
        ],
        '\n',
      )
      await bot.telegram.sendMessage(chat, statText)
      const birthdays = stats.filter((item) => item.birthdayTomorrow)
      if (birthdays.length) {
        await util.timeout(1000)
        const birthdayText = format.join(
          ['🎉', ...birthdays.map((item) => format.mention(`@${item.username}`, item.user)), '要过生日了！🎉'],
          ' ',
        )
        await bot.telegram.sendMessage(chat, birthdayText)
        await bot.telegram.sendSticker(chat, 'CAADAwADLAADwzqBCUqnLyWgE1T4Ag')
      }
    }
    chats.forEach((chat) => delete store.data.stats.count[chat])
    await store.write()
  }
}
