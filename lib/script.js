module.exports = (local) => (controller) => {
  const util = require('util')
  const redis = require(local ? 'redis-mock' : 'redis')

  const store = redis.createClient({host: 'redis'})
  for (const method of [
    'get', 'set', 'mget', 'mset', 'del',
    'sadd', 'smembers',
    'hget', 'hset', 'hincrby', 'hgetall'
  ]) { store[method] = util.promisify(store[method]) }

  const key = (...parts) => parts.filter(part => part).join(':')
  const msg = (text, replyTo, channel) => ({text, replyTo, channel})
  const timeout = util.promisify(setTimeout)
  const random = (array) => array[Math.floor(Math.random() * array.length)]
  const dateNow = () => new Date(Date.now() + 8 * 60 * 60 * 1000)
  const dateString = (date) => [
    `${date.getUTCFullYear()}年`,
    `${date.getUTCMonth() + 1}月`,
    `${date.getUTCDate()}日`,
    `星期${[...'日一二三四五六'][date.getUTCDay()]}`
  ].join('')
  const dayString = (month, day) => [
    month.toString().slice(-2).padStart(2, '0'),
    day.toString().slice(-2).padStart(2, '0')
  ].join()
  const dateDay = (date) => [date.getUTCMonth(), date.getUTCDate()]
  const dateIncrease = (date) => {
    date.setDate(date.getDate() + 1)
    return date
  }

  controller.on('messageReceived', async (bot, message) => {
    const {user, channel} = message
    await store.sadd(key('user'), user)
    await store.sadd(key('channel'), channel)
    await store.set(key(user, 'username'), message.data.username)
    await store.hincrby(key(channel, 'messageCount'), user, 1)
    if (message.data.sticker) {
      await store.hincrby(key(channel, 'stickerCount'), user, 1)
    }
  })

  controller.on('conversationStarted', (bot, convo) => {
    convo.setTimeout(15 * 1000)
  })

  controller.hears(/^\/$/iu, 'command', (bot, message) => {
    if (message.replyTo) {
      bot.reply(message, msg(random([
        '你说的对！',
        '对，你说的都对！'
      ]), message.replyTo))
    } else {
      bot.reply(message, msg(random([
        '虽然不是很明白，但是你说的对！',
        '明白了，你说的太对了！'
      ]), message.id))
    }
  })

  controller.hears(/(竟然|居然|对吧|真是|真的是|是不是)/iu, 'message', (bot, message) => {
    bot.reply(message, msg(random([
      '你说的对！',
      '对，你说的都对！',
      'sticker:CAADBQADeQ8AAq4QPgXVHuXxE5x9FwI'
    ])))
  })

  controller.hears(/(twitter.com|sinaimg.cn|weibo.cn)/iu, 'message', (bot, message) => {
    switch (dateNow().getUTCDay()) {
      case 0:
      case 6:
        bot.reply(message, msg(random([
          'hhhh xswl',
          'sticker:CAADBQADBgIAAj3XUhNLZtVI1LrXCwI',
          'sticker:CAADBQADBwIAAj3XUhMfMkH-AgABMAgC',
          'sticker:CAADBQADFgIAAj3XUhMzH5SHrMsKCAI',
          'sticker:CAADBQADKgIAAj3XUhMpmzNkDgkDQgI'
        ])))
        break
      default:
        bot.reply(message, msg(random([
          'hhhh xswl',
          '让我看看是谁又在划水',
          'sticker:CAADBQADBgIAAj3XUhNLZtVI1LrXCwI',
          'sticker:CAADBQADBwIAAj3XUhMfMkH-AgABMAgC',
          'sticker:CAADBQADFgIAAj3XUhMzH5SHrMsKCAI',
          'sticker:CAADBQADKgIAAj3XUhMpmzNkDgkDQgI'
        ])))
        break
    }
  })

  controller.hears(/(kywkl)/iu, 'message', (bot, message) => {
    bot.reply(message, msg('→ https://wukongmusic.us/test'))
  })

  controller.hears(/生日/iu, 'message', (bot, message) => {
    let month = 0, day = 0, match = null
    if ((match = message.text.match(/(\d{1,2})[.-月](\d{1,2})/)) &&
      match[1] >= 1 && match[1] <= 12 && match[2] >= 1 && match[2] <= 31) {
      month = match[1] - 1
      day = match[2]
    } else if ((match = message.text.match(/今天/))) {
      const today = dateNow()
      month = today.getUTCMonth()
      day = today.getUTCDate()
    } else if ((match = message.text.match(/明天/))) {
      const tomorrow = dateIncrease(dateNow())
      month = tomorrow.getUTCMonth()
      day = tomorrow.getUTCDate()
    }
    if (!month || !day) return
    const save = async () => {
      await store.set(key(message.user, 'birthday'), dayString(month, day))
    }
    bot.startConversation(message, (error, convo) => {
      convo.ask(msg(`你的生日是${month + 1}月${day}日吗，要不要我记一下？`, message.id), [{
        pattern: /(yes|ok|好|谢)/iu,
        callback: (message, convo) => {
          convo.say(msg('好！！'))
          convo.say(msg('sticker:CAADBQADJQIAAj3XUhOdvdmFk1hX9QI'))
          convo.next()
          save()
        }
      }, {
        pattern: /(no|不|别)/iu,
        callback: (message, convo) => {
          convo.say(msg('噫，好吧'))
          convo.say(msg('sticker:CAADBQADKgIAAj3XUhMpmzNkDgkDQgI'))
          convo.next()
        }
      }, {
        default: true,
        callback: (message, convo) => {
          convo.stop()
        }
      }])
    })
  })

  controller.on('spawned', async (bot) => {
    for (;;) {
      const now = dateNow()
      await (async () => {
        const nowTime = local
          ? now.getUTCSeconds() % 10
          : (now.getUTCHours() * 60 + now.getUTCMinutes()) * 60 + now.getUTCSeconds()
        const scheduleTime = local
          ? 10
          : 24 * 60 * 60
        await timeout((scheduleTime - nowTime) * 1000)
      })()

      const channels = (await store.smembers('channel')) || []
      for (const channel of channels) {
        const messageCount = (await store.hgetall(key(channel, 'messageCount'))) || {}
        const users = Object.keys(messageCount)
        if (!users.length) continue
        const stickerCount = (await store.hgetall(key(channel, 'stickerCount'))) || {}
        const usernames = (await store.mget(users.map(user => key(user, 'username')))) || []
        const birthdays = (await store.mget(users.map(user => key(user, 'birthday')))) || []
        const stats = users
          .map((user, index) => ({
            username: usernames[index] || '',
            messageCount: messageCount[user] || 0,
            stickerCount: stickerCount[user] || 0,
            isBirthday: birthdays[index] == dayString(...dateDay(now)),
            upcomingBirthday: birthdays[index] == dayString(...dateDay(dateIncrease(now)))
          }))
          .sort((item1, item2) => item1.messageCount - item2.messageCount)

        const text = [
          `📅本群日报 - ${dateString(now)}`,
          ...stats
            .filter((item) => item.messageCount > 0)
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
              strings.push(`${item.messageCount}条消息`)
              strings.push(`${(100 * item.stickerCount / item.messageCount).toFixed(2)}%表情`)
              if (item.isBirthday) {
                strings.push('生日快乐！')
              }
              return strings.join(' ')
            })
        ].join('\n')
        bot.say(msg(text, null, channel))

        const usersWithUpcomingBirthday = stats
          .filter(item => item.upcomingBirthday)
          .map(item => `@${item.username}`)
        if (usersWithUpcomingBirthday.length) {
          const text = ['🎉', usersWithUpcomingBirthday, '要过生日了！', '🎉'].join(' ')
          bot.say(msg(text, null, channel))
          bot.say(msg('sticker:CAADAwADLAADwzqBCUqnLyWgE1T4Ag', null, channel))
        }

        await store.del([
          key(channel, 'messageCount'),
          key(channel, 'stickerCount')
        ])
      }

      await timeout(1000)
    }
  })
}
