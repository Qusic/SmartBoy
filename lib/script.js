module.exports = (controller) => {
  const util = require('util')

  const timeout = util.promisify(setTimeout)
  const random = (array) => array[Math.floor(Math.random() * array.length)]
  const dateNow = () => new Date(Date.now() + 8 * 60 * 60 * 1000)
  const dateStringify = (date) => date.toLocaleDateString('zh-CN', {
    timeZone: 'UTC',
    weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric'
  })

  const promisify = (object) => Object.keys(object).reduce((result, key) => {
    result[key] = util.promisify(object[key])
    return result
  }, {})
  const userStore = promisify(controller.storage.users)
  const channelStore = promisify(controller.storage.channels)

  const msg = (content, replyTo, channel) => {
    const message = {}
    if (content) {
      message.text = content
    }
    if (replyTo) {
      message.replyTo = replyTo
    }
    if (channel) {
      message.channel = channel
    }
    return message
  }

  controller.on('messageReceived', async (bot, message) => {
    const {user, channel} = message
    const userData = (await userStore.get(user)) || {id: user}
    const channelData = (await channelStore.get(channel)) || {id: channel}

    userData.username = message.data.username || ''

    channelData.messageCount = channelData.messageCount || {}
    channelData.messageCount[user] = channelData.messageCount[user] || 0
    channelData.messageCount[user] += 1

    channelData.stickerCount = channelData.stickerCount || {}
    channelData.stickerCount[user] = channelData.stickerCount[user] || 0
    if (message.data.sticker) {
      channelData.stickerCount[user] += 1
    }

    await userStore.save(userData)
    await channelStore.save(channelData)
  })

  controller.on('conversationStarted', (bot, convo) => {
    convo.setTimeout(5 * 1000)
  })

  controller.hears(/^\/$/iu, 'command', (bot, message) => {
    if (message.replyTo) {
      bot.reply(message, msg('你说的对！', message.replyTo))
    } else {
      bot.reply(message, msg('虽然不知道在说啥，但是你说的对！', message.id))
    }
  })

  controller.hears(/(竟然|居然|对吧|真是|真的是|是不是)/iu, 'message', (bot, message) => {
    bot.reply(message, msg(random(['你说的对！', '对，你说的都对！'])))
  })

  controller.hears(/(twitter.com|sinaimg.cn|weibo.cn)/iu, 'message', (bot, message) => {
    switch (dateNow().getUTCDay()) {
      case 0:
      case 6:
        bot.reply(message, msg('hhhh xswl'))
        break
      default:
        bot.reply(message, msg(random(['hhhh xswl', '让我看看是谁又在划水'])))
        break
    }
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
      const tomorrow = dateNow()
      tomorrow.setDate(tomorrow.getDate() + 1)
      month = tomorrow.getUTCMonth()
      day = tomorrow.getUTCDate()
    }
    if (!month || !day) return
    const save = async () => {
      const data = (await userStore.get(message.user))
      data.birthday = {month, day}
      await userStore.save(data)
    }
    bot.startConversation(message, (error, convo) => {
      convo.ask(msg(`你的生日是${month + 1}月${day}日吗，要不要我记一下？`, message.id), [{
        pattern: /(yes|ok|好|谢)/iu,
        callback: (message, convo) => {
          convo.say(msg('好！！'))
          convo.say(msg('sticker:CAADAwADLAADwzqBCUqnLyWgE1T4Ag'))
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

  controller.hears(/(kywkl)/iu, 'message', (bot, message) => {
    bot.startConversation(message, (error, convo) => {
      convo.ask(msg('→ https://wukongmusic.us/test'), [{
        pattern: /(bky|不)/iu,
        callback: (message, convo) => {
          convo.say(msg('为啥不可以'))
          convo.next()
        }
      }])
    })
  })

  controller.on('spawned', async (bot) => {
    const {debug} = controller.config
    for (;;) {
      const now = dateNow()
      await (async () => {
        const nowTime = debug
          ? now.getUTCSeconds() % 10
          : (now.getUTCHours() * 60 + now.getUTCMinutes()) * 60 + now.getUTCSeconds()
        const scheduleTime = debug
          ? 10
          : 24 * 60 * 60
        await timeout((scheduleTime - nowTime) * 1000)
      })()

      const userData = (await userStore.all()) || {}
      const channelData = (await channelStore.all()) || {}
      for (const channel in channelData) {
        const data = channelData[channel]
        const {messageCount, stickerCount} = data
        const stats = Object.keys(messageCount)
          .filter((user) => userData[user])
          .map((user) => ({
            user,
            username: userData[user].username,
            messageCount: messageCount[user],
            stickerCount: stickerCount[user]
          }))
          .sort((item1, item2) => item1.messageCount - item2.messageCount)

        const text = [
          `📅本群日报 - ${dateStringify(now)}`
        ].concat(stats.map((item, index) => {
          const strings = []
          const isBirthday = (() => {
            const {birthday} = userData[item.user]
            const month = now.getUTCMonth()
            const day = now.getUTCDate()
            return birthday && birthday.month == month && birthday.day == day
          })()
          if (isBirthday) {
            strings.push('🎂')
          } else {
            const emoji1 = ['🥇', '🥈', '🥉']
            const emoji2 = ['😀', '🙂', '😗', '😐']
            if (index < emoji1.length) {
              strings.push(emoji1[index])
            } else {
              strings.push(random(emoji2))
            }
          }
          strings.push(`@${item.username}:`)
          strings.push(`${item.messageCount}条消息`)
          strings.push(`${(100 * item.stickerCount / item.messageCount).toFixed(2)}%表情`)
          if (isBirthday) {
            strings.push('生日快乐！')
          }
          return strings.join(' ')
        })).join('\n')

        bot.say(msg(text, null, channel))
      }

      await timeout(1000)
    }
  })
}
