const terminal = () => {
  const readline = require('readline')
  const reader = readline.createInterface({input: process.stdin, output: process.stdout})

  const config = {
    debug: true
  }

  const receive = (callback) => {
    const command = '@bot'
    reader.on('line', (line) => {
      const message = {
        channel: 'terminal',
        date: Date.now(),
        user: 'keyboard',
        type: 'message',
        text: line,
        data: {
          username: 'SmartBoy',
          sticker: Math.random() < 0.2
        }
      }
      if (message.text.includes(command)) {
        message.type = 'command'
        message.text = `/${message.text.replace(command, '').trim()}`
      }
      callback(message)
    })
  }

  const send = (message, callback) => {
    let string = 'BOT'
    if (message.replyTo) {
      string += `(${message.replyTo})`
    }
    string += ': '
    string += message.text
    console.log(string) // eslint-disable-line no-console
    if (callback) {
      callback()
    }
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
    debug: false
  }

  const receive = async (callback) => {
    const me = await telegram.getMe()
    const command = `@${me.username}`
    telegram.on('message', (rawMessage) => {
      const message = {
        id: rawMessage.message_id,
        channel: rawMessage.chat.id,
        date: new Date(rawMessage.date),
        type: 'message',
        data: {}
      }
      if (rawMessage.from) {
        message.user = rawMessage.from.id
        message.data.username = rawMessage.from.username
      }
      if (rawMessage.reply_to_message) {
        message.replyTo = rawMessage.reply_to_message.message_id
      }
      const texts = []
      if (rawMessage.text) {
        texts.push(rawMessage.text)
      }
      for (const media of ['sticker', 'voice', 'photo', 'audio', 'video', 'document']) {
        if (rawMessage[media]) {
          texts.push(`[${media}]`)
        }
      }
      if (rawMessage.caption) {
        texts.push(rawMessage.caption)
      }
      message.text = texts.map(text => text.trim()).filter(text => text).join(' ')
      if (message.text.includes(command)) {
        message.type = 'command'
        message.text = `/${message.text.replace(command, '').trim()}`
      }
      if (rawMessage.sticker) {
        message.data.sticker = rawMessage.sticker.file_id
      }
      callback(message)
    })
  }

  const send = async (message, callback) => {
    const chat = message.channel
    const text = message.text
    const options = {}
    if (message.replyTo) {
      options.reply_to_message_id = message.replyTo
    }
    if (text) {
      await (async () => {
        const fallback = async (text) => {
          await telegram.sendChatAction(chat, 'typing')
          await timeout(Math.min(Math.max(text.length / 7, 1), 4) * 1000)
          await telegram.sendMessage(chat, text, options)
        }
        const prefixes = {
          'sticker:': async (value) => {
            await telegram.sendSticker(chat, value)
          }
        }
        for (const prefix in prefixes) {
          if (text.startsWith(prefix)) {
            const value = text.substring(prefix.length)
            if (value) {
              await prefixes[prefix](value)
              return
            }
          }
        }
        await fallback(text)
      })()
    }
    if (callback) {
      callback()
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
