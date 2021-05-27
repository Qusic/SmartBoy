import {bot, http, store} from './app.js'
import addons from './addons/index.js'
import {session, Scenes} from 'telegraf'

async function run() {
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
  await bot.launch()
  const server = http.listen(80)
  addons.forEach((addon) => addon.run())
  for (const event of ['SIGINT', 'SIGTERM']) {
    process.once(event, () => {
      bot.stop(event)
      server.close()
      store.quit()
    })
  }
}

run()
