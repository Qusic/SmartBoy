const Botkit = require('botkit')

module.exports = class Controller extends Botkit.core {
  constructor(connector, script, debug) {
    super({debug, ...connector.config()})

    this.middleware.spawn.use((bot, next) => {
      this.setTickDelay(1000)
      this.startTicking()
      connector.receive((message) => {
        this.ingest(bot, message, null)
      })
      next()
    })

    this.middleware.format.use((bot, message, rawMessage, next) => {
      for (const property in message) {
        rawMessage[property] = message[property]
      }
      next()
    })

    this.middleware.receive.use((bot, message, next) => {
      this.trigger('messageReceived', [bot, message])
      next()
    })

    this.defineBot(class {
      constructor(botkit, config) {
        this.botkit = botkit
        this.config = config
        this.utterances = botkit.utterances
      }

      send(message, callback) {
        connector.send(message, callback)
      }

      reply(message, response, callback) {
        response.channel = message.channel
        this.say(response, callback)
      }

      findConversation(message, callback) {
        for (const task of this.botkit.tasks) {
          for (const convo of task.convos) {
            if (!convo.isActive()) continue
            if (convo.source_message.user != message.user) continue
            if (convo.source_message.channel != message.channel) continue
            if (this.botkit.excludedEvents.includes(message.type)) continue
            callback(convo)
            return
          }
        }
        callback()
      }
    })

    script(this)
  }
}
