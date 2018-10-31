module.exports = (local) => (controller) => {
  const util = require('util')
  const redis = require(local ? 'redis-mock' : 'redis')
  const axios = require('axios')

  const store = redis.createClient({host: 'redis'})
  for (const method of [
    'get', 'set', 'mget', 'mset', 'del',
    'sadd', 'smembers',
    'hget', 'hset', 'hincrby', 'hgetall'
  ]) { store[method] = util.promisify(store[method]) }
  // const {telegram} = controller.config

  const key = (...parts) => parts.filter(part => part).join(':')
  const msg = (text, replyTo, channel) => ({text, replyTo, channel})
  const timeout = util.promisify(setTimeout)
  const random = (array) => array[Math.floor(Math.random() * array.length)]
  const timezone = 8 * 60 * 60 * 1000
  const dateNow = () => new Date(Date.now() + timezone)
  const dateString = (date) => [
    `${date.getUTCFullYear()}年`,
    `${date.getUTCMonth() + 1}月`,
    `${date.getUTCDate()}日`,
    `星期${[...'日一二三四五六'][date.getUTCDay()]}`
  ].join('')
  const dayString = (month, day) => [
    month.toString().slice(-2).padStart(2, '0'),
    day.toString().slice(-2).padStart(2, '0')
  ].join('')
  const dateDay = (date) => [date.getUTCMonth(), date.getUTCDate()]
  const dateIncrease = (date) => {
    date = new Date(date.getTime())
    date.setUTCDate(date.getUTCDate() + 1)
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

  controller.on('messageReceived', async (bot, message) => {
    const {user, channel} = message
    await store.set(key(user, 'username'), message.data.username)
    if (message.data.groupchat) {
      await store.sadd(key('channel'), channel)
      await store.hincrby(key(channel, 'messageCount'), user, 1)
      if (message.data.sticker) {
        await store.hincrby(key(channel, 'stickerCount'), user, 1)
      }
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

  controller.hears(/(这首|这.?歌)/iu, 'message', async (bot, message) => {
    const {data} = await axios.get('https://wukong.leeleo.me/api/channel/test/song')
    if (!data) return
    const {title, artist, webUrl} = data
    bot.reply(message, `Wukong#test: ${title} - ${artist}\n${webUrl}`)
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
    } else {
      return
    }
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
      const today = dateNow()
      if (local) {
        await timeout(10 * 1000)
      } else {
        const scheduleTime = dateOrigin(dateIncrease(today)).getTime()
        for (;;) {
          const waitTime = scheduleTime - dateNow().getTime()
          if (waitTime < 0) break
          await timeout(Math.max(waitTime, 1000))
        }
      }

      const channels = (await store.smembers('channel')) || []
      for (const channel of channels) {
        const messageCount = (await store.hgetall(key(channel, 'messageCount'))) || {}
        const users = Object.keys(messageCount)
        if (!users.length) continue
        const stickerCount = (await store.hgetall(key(channel, 'stickerCount'))) || {}
        const usernames = (await store.mget(users.map(user => key(user, 'username')))) || []
        const birthdays = (await store.mget(users.map(user => key(user, 'birthday')))) || []
        const stats = users.map((user, index) => ({
          username: usernames[index] || '',
          messageCount: parseInt(messageCount[user]) || 0,
          stickerCount: parseInt(stickerCount[user]) || 0,
          isBirthday: birthdays[index] == dayString(...dateDay(today)),
          upcomingBirthday: birthdays[index] == dayString(...dateDay(dateIncrease(today)))
        }))
        stats.forEach(item => {
          item.textCount = item.messageCount - item.stickerCount
        })

        const text = [
          `📅本群日报 - ${dateString(today)}`,
          ...stats
            .filter((item) => item.messageCount > 0)
            .sort((item1, item2) => item2.textCount - item1.textCount)
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
              strings.push(`+${(100 * item.stickerCount / item.textCount).toFixed(2)}%表情`)
              if (item.isBirthday) {
                strings.push(' 生日快乐！')
              }
              return strings.join('')
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
    }
  })
}
