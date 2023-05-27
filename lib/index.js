import {Scenes, session} from 'telegraf'
import {useNewReplies} from 'telegraf/future'

import addons from './addons/index.js'
import {bot, http, store} from './app.js'
import config from './config.js'

async function run() {
  await store.read()
  bot.use(useNewReplies())
  bot.use(session())
  bot.use(
    new Scenes.Stage(
      (await Promise.all(addons.map((addon) => addon.scene()))).flatMap((items) => items),
      {ttl: 15}
    ).middleware()
  )
  await Promise.all(addons.map((addon) => addon.setup()))
  await bot.telegram.setMyCommands(
    (await Promise.all(addons.map((addon) => addon.command()))).flatMap((items) => items)
  )
  bot.launch()
  const server = http.listen(config.port, config.host)
  addons.forEach((addon) => addon.run())
  for (const event of ['SIGINT', 'SIGTERM']) {
    process.once(event, () => {
      store.write()
      bot.stop(event)
      server.close()
    })
  }
}

run()
