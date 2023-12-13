import {bing, bot, store} from '../app.js'
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
      command: 'bingprompt',
      description: 'Bing Prompt',
    },
    {
      command: 'bingchat',
      description: 'Bing Chat',
    },
  ]
}

export async function scene() {
  return []
}

export async function setup() {
  store.data.chat ||= {}
  bot
    .command('bingprompt', async (context) => {
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
    .command('bingchat', async (context) => {
      if (context.chat.id != config.admin && context.chat.id != config.chat) return
      let text = context.message.text.replace(/^\/\w+\s*/, '').trim()
      if (text) {
        const reply = await bing({style: 'precise', text: text})
        if (reply.text) await context.sendMessage(reply.text)
      }
    })
    .on('message', async (context, next) => {
      if (context.chat.id == config.chat && !context.from.is_bot) {
        const {text} = context.message
        if (text) {
          state.messages.push(text)
          state.debouncer.talk(async () => {
            const {prompt} = store.data.chat
            const message = state.messages.join('\n')
            const reply = await bing({style: 'precise', text: [prompt, '', '"""', message, '"""'].join('\n')})
            if (reply.text) await context.sendMessage(reply.text)
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
