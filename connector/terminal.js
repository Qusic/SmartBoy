module.exports = () => {
  const readline = require('readline')
  const reader = readline.createInterface({input: process.stdin, output: process.stdout})

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
    console.log(string)
  }

  return {receive, send}
}
