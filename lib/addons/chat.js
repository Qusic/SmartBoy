import {bot, openai, store} from '../app.js'
import config from '../config.js'

const state = {
  messages: [],
  timeout: null,
}

export async function command() {
  return [
    {
      command: 'prompt',
      description: '聊天的System Prompt',
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
      await context.sendMessage(JSON.stringify(value), {reply_to_message_id: context.message.message_id})
    })
    .on('message', async (context, next) => {
      if (context.chat.id == config.chat && !context.from.is_bot) {
        const {text} = context.message
        if (text) {
          state.messages.push(text)
          clearTimeout(state.timeout)
          state.timeout = setTimeout(async () => {
            const {prompt} = store.data.chat
            const message = state.messages.join('\n')
            state.messages = []
            const completion = await openai.chat.completions.create({
              model: 'llama2cn',
              max_tokens: 512,
              messages: [
                {role: 'system', content: prompt},
                {role: 'user', content: message},
              ],
            })
            const reply = completion.choices[0].message.content
            if (reply) {
              await context.sendMessage(reply)
            }
          }, 60000)
        }
      }
      await next()
    })
}

export async function run() {}
