import {store, bot, http} from './app.js'
import {useNewReplies} from 'telegraf/future'
import addons from './addons/index.js'
import {session, Scenes} from 'telegraf'

async function run() {
  await store.read()
  store.data ||= {}
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
  await bot.launch()
  const server = http.listen(80)
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
