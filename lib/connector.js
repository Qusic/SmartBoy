const util = require('util')
const timeout = util.promisify(setTimeout)

module.exports = (token) => token ? new Telegram(token) : new Terminal()

class Terminal {
  constructor() {
    const readline = require('readline')
    this.terminal = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
  }

  config() {
    return {}
  }

  receive(callback) {
    const command = '@bot'
    this.terminal.on('line', (line) => {
      const message = {
        channel: 'terminal',
        date: Date.now(),
        user: 'keyboard',
        type: 'message',
        text: line,
        data: {
          username: 'SmartBoy',
          groupchat: true,
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

  send(message, callback) {
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
}

class Telegram {
  constructor(token) {
    const TelegramAPI = require('node-telegram-bot-api')
    this.telegram = new TelegramAPI(token, {
      polling: {
        autoStart: true,
        interval: 1000,
        params: {
          timeout: 60
        }
      }
    })
  }

  config() {
    return {telegram: this.telegram}
  }

  async receive(callback) {
    const me = await this.telegram.getMe()
    const command = `@${me.username}`
    this.telegram.on('message', (rawMessage) => {
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
      if (['group', 'supergroup'].includes(rawMessage.chat.type)) {
        message.data.groupchat = true
      }
      if (rawMessage.sticker) {
        message.data.sticker = rawMessage.sticker.file_id
      }
      callback(message)
    })
  }

  async send(message, callback) {
    const chat = message.channel
    const text = message.text
    const options = {}
    if (message.replyTo) {
      options.reply_to_message_id = message.replyTo
    }
    if (text) {
      const fallback = async (text) => {
        await this.telegram.sendChatAction(chat, 'typing')
        await timeout(1000)
        await this.telegram.sendMessage(chat, text, options)
      }
      const prefixes = {
        'sticker:': async (value) => {
          await this.telegram.sendSticker(chat, value)
        }
      }
      await (async () => {
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
}
