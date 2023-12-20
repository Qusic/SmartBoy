import {bot, openai, store} from '../app.js'
import config from '../config.js'
import * as util from '../util.js'

const state = {
  messages: [],
  debouncer: {
    talk: util.debounce(1000 * 60 * 2),
    topic: util.debounce(1000 * 60 * 3),
  },
}

export async function command() {
  return [
    {
      command: 'prompt',
      description: '设置Prompt',
    },
  ]
}

export async function scene() {
  return []
}

export async function setup() {
  store.data.chat ||= {}
  bot
    .command('prompt', async (context) => {
      if (context.chat.id != config.admin) return
      let value = context.message.text.replace(/^\/\w+\s*/, '').trim()
      if (value) {
        store.data.chat.prompt = value
        await store.write()
      } else {
        value = store.data.chat.prompt
      }
      await context.sendMessage(value, {reply_to_message_id: context.message.message_id})
    })
    .on('message', async (context, next) => {
      if (context.chat.id == config.chat && !context.from.is_bot) {
        const name = util.displayName(context.message.from)
        const text = context.message.text || context.message.caption
        if (text) {
          state.messages.push(`${name}: ${text}`)
          if (state.messages.length > 10) state.messages.shift()
          state.debouncer.talk(async () => {
            const {prompt} = store.data.chat
            const message = state.messages.join('\n')
            let reply = ''
            try {
              const result = await openai.chat.completions.create({
                ...config.openai.chat,
                messages: [
                  {role: 'system', content: prompt},
                  {role: 'user', content: message},
                ],
              })
              reply = result.choices[0].message.content
            } catch (error) {
              reply = error.stack
            }
            if (reply) await context.sendMessage(reply)
          })
          state.debouncer.topic(() => {
            state.messages = []
          })
        }
      }
      await next()
    })
}

export async function run() {}
