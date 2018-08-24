const telegram = require('./telegram')
const terminal = require('./terminal')

const token = process.env.TOKEN

if (token) {
  module.exports = {
    ...telegram(token),
    options: {
      debug: false
    }
  }
} else {
  module.exports = {
    ...terminal(),
    options: {
      debug: true
    }
  }
}
