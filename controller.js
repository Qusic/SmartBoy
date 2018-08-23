const Botkit = require('botkit')

const controller = Botkit.core({debug: true})
// const controller = Botkit.consolebot({debug: true})
module.exports = controller

// const telegram = (() => {
//   const token = process.env.TOKEN
//   if (token) {
//     const TelegramAPI = require('node-telegram-bot-api')
//     return TelegramAPI(token, {polling: true})
//   }
// })()

controller.middleware.spawn.use((bot, next) => {
  controller.setTickDelay(100)
  controller.startTicking()
  const readline = require('readline')
  const reader = readline.createInterface({input: process.stdin, output: process.stdout})
  reader.on('line', (line) => {
    const message = {
      user: 'user',
      channel: 'text',
      text: line,
      time: Date.now()
    }
    controller.ingest(bot, message, null)
  })
  next()
})

controller.middleware.format.use((bot, message, rawMessage, next) => {
  for (const property in message) {
    rawMessage[property] = message[property]
  }
  next()
})

controller.defineBot(class {
  constructor(botkit, config) {
    this.botkit = botkit
    this.config = config
    this.utterances = botkit.utterances
  }

  send(message, callback) {
    console.log('Bot:', message.text)
    if (callback) callback()
  }

  reply(message, response, callback) {
    if (typeof(response) != 'object') {
      response = {text: response}
    }
    this.say(response, callback)
  }

  findConversation(message, callback) {
    for (const task of this.botkit.tasks) {
      for (const convo of task.convos) {
        if (!convo.isActive()) continue
        if (convo.source_message.user != message.user) continue
        if (this.botkit.excludedEvents.includes(message.type)) continue
        callback(convo)
        return
      }
    }
    callback()
  }
})
