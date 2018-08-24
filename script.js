module.exports = (controller) => {
  const text = (text, replyTo) => ({text, replyTo})

  controller.hears(/^@bot/iu, 'message_received', (bot, message) => {
    // const text = message.text.substring('@bot'.length).trim()
    bot.reply(message, text('你说的对！', message.id))
  })

  controller.hears(/(竟然|居然|对吧|真是|真的是|是不是)/iu, 'message_received', (bot, message) => {
    bot.reply(message, text('你说的对！'))
  })

  controller.hears(/(twitter.com|sinaimg.cn|weibo.cn)/iu, 'message_received', (bot, message) => {
    bot.reply(message, text('hhhh xswl'))
  })

  controller.hears(/(kywkl)/iu, 'message_received', (bot, message) => {
    bot.startConversation(message, (error, convo) => {
      convo.ask(text('→ https://wukongmusic.us/test'), [{
        pattern: /(不|bky)/iu,
        callback: (message, convo) => {
          convo.say(text('为啥不可以'))
          convo.next()
        }
      }])
    })
  })

  controller.on('conversationStarted', (bot, convo) => {
    convo.setTimeout(5 * 1000)
  })
}
