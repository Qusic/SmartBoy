const terminal = () => {
  const readline = require('readline')
  const reader = readline.createInterface({input: process.stdin, output: process.stdout})

  const config = {
    debug: true
  }

  const receive = (callback) => {
    reader.on('line', (line) => {
      const message = {
        channel: 'text',
        date: Date.now(),
        user: 'user',
        text: line
      }
      callback(message)
    })
  }

  const send = (message) => {
    let string = 'BOT'
    if (message.replyTo) {
      string += `(${message.replyTo})`
    }
    string += ': '
    string += message.text
    console.log(string) // eslint-disable-line no-console
  }

  return {config, receive, send}
}

const telegram = (token) => {
  const util = require('util')
  const timeout = util.promisify(setTimeout)
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

  const config = {
    debug: false,
    telegram: telegram
  }

  const receive = async (callback) => {
    const me = await telegram.getMe()
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

  const send = async (message) => {
    const chat = message.channel
    const text = message.text
    const options = {}
    if (message.replyTo) {
      options.reply_to_message_id = message.replyTo
    }
    if (text) {
      await telegram.sendChatAction(chat, 'typing')
      await timeout(Math.min(Math.max(text.length / 7, 1), 4) * 1000)
      await telegram.sendMessage(chat, text, options)
    }
  }

  return {config, receive, send}
}

const token = process.env.TOKEN
if (token) {
  module.exports = telegram(token)
} else {
  module.exports = terminal()
}
