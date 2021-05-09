import bot from './bot.js'
import store from './store.js'
import addons from './addons/index.js'

const callbacks = addons.map((addon) => addon(bot, store))

bot.launch().then(() => {
  for (const event of ['SIGINT', 'SIGTERM']) {
    process.once(event, () => {
      bot.stop(event)
      store.quit()
    })
  }
  callbacks.forEach((callback) => callback())
})
