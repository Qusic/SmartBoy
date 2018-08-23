module.exports = (controller) => {
  controller.hears(['竟然', '居然', '对吧', '真是', '真的是', '是不是'], 'message_received', (bot, message) => {
    bot.reply(message, '你说的对！')
  })

  controller.hears(['twitter.com', 'sinaimg.cn', 'weibo.cn'], 'message_received', (bot, message) => {
    bot.say('hhhh xswl')
  })

  controller.hears(['kywkl'], 'message_received', (bot, message) => {
    bot.startConversation(message, (error, convo) => {
      convo.ask('→ https://wukongmusic.us/test', [{
        pattern: ['不'],
        callback: (message, convo) => {
          convo.say('为啥不可以')
          convo.next()
        }
      }])
    })
  })

  controller.on('conversationStarted', (bot, convo) => {
    convo.setTimeout(60 * 1000)
  })
}
