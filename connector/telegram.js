module.exports = (token) => {
  const TelegramAPI = require('node-telegram-bot-api')
  const telegram = new TelegramAPI(token, {
    polling: {
      autoStart: true,
      interval: 1000,
      params: {
        timeout: 60
      }
    }
  })

  const receive = async (callback) => {
    const me = await telegram.getMe()
    console.log(me)
    telegram.on('text', (rawMessage) => {
      const message = {
        id: rawMessage.message_id,
        channel: rawMessage.chat.id,
        date: new Date(rawMessage.date)
      }
      if (rawMessage.from) {
        message.user = rawMessage.from.id
      }
      if (rawMessage.reply_to_message) {
        message.replyTo = rawMessage.reply_to_message.message_id
      }
      message.text = rawMessage.text.replace(`@${me.username}`, '@bot')
      callback(message)
    })
  }

  const send = (message) => {
    const chat = message.channel
    const text = message.text
    const options = {}
    if (message.replyTo) {
      options.reply_to_message_id = message.replyTo
    }
    if (text) {
      telegram.sendMessage(chat, text, options)
    }
  }

  return {receive, send}
}
