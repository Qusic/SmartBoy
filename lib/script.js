module.exports = (controller) => {
  const msg = (content, replyTo) => {
    const message = {}
    if (content) {
      message.text = content
    }
    if (replyTo) {
      message.replyTo = replyTo
    }
    return message
  }

  controller.hears(/^@bot/iu, 'message_received', (bot, message) => {
    const text = message.text.substring('@bot'.length).trim()
    if (text == '') {
      if (message.replyTo) {
        bot.reply(message, msg('你说的对！', message.replyTo))
      }
    }
  })

  controller.hears(/(竟然|居然|对吧|真是|真的是|是不是)/iu, 'message_received', (bot, message) => {
    bot.reply(message, msg('你说的对！'))
  })

  controller.hears(/(twitter.com|sinaimg.cn|weibo.cn)/iu, 'message_received', (bot, message) => {
    bot.reply(message, msg('hhhh xswl'))
  })

  controller.hears(/(kywkl)/iu, 'message_received', (bot, message) => {
    bot.startConversation(message, (error, convo) => {
      convo.ask(msg('→ https://wukongmusic.us/test'), [{
        pattern: /(不|bky)/iu,
        callback: (message, convo) => {
          convo.say(msg('为啥不可以'))
          convo.next()
        }
      }])
    })
  })

  controller.on('conversationStarted', (bot, convo) => {
    convo.setTimeout(5 * 1000)
  })
}
