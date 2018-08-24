const token = process.env.TOKEN
if (token) {
  // const TelegramAPI = require('node-telegram-bot-api')
  // const telegram = TelegramAPI(token, {polling: true})
  // module.exports.options = {debug: false}
  // module.exports.send = (message) => {
  // }
  // module.exports.receive = (callback) => {
  // }
} else {
  const readline = require('readline')
  const reader = readline.createInterface({input: process.stdin, output: process.stdout})
  module.exports.options = {debug: true}
  module.exports.send = (message) => {
    console.log('BOT:', message.text)
  }
  module.exports.receive = (callback) => {
    reader.on('line', (line) => {
      const message = {
        user: 'user',
        channel: 'text',
        text: line,
        time: Date.now()
      }
      callback(message)
    })
  }
}
