import {bot, openai, store} from '../app.js'
import config from '../config.js'

export async function command() {
  return [
    {
      command: 'pget',
      description: '查询聊天的System Prompt',
    },
    {
      command: 'pset',
      description: '设置聊天的System Prompt',
    },
    {
      command: 'c',
      description: '聊天',
    },
  ]
}

export async function scene() {
  return []
}

export async function setup() {
  store.data.chat ||= {}
  bot
    .command('pget', async (context) => {
      if (context.chat.id != config.chat) return
      const value = store.data.chat.prompt || null
      await context.sendMessage(JSON.stringify(value), {reply_to_message_id: context.message.message_id})
    })
    .command('pset', async (context) => {
      if (context.chat.id != config.chat) return
      const value = context.message.text.replace(/^\/\w+\s*/, '').trim()
      store.data.chat.prompt = value
      await store.write()
      await context.sendMessage(JSON.stringify(value), {reply_to_message_id: context.message.message_id})
    })
    .command('c', async (context) => {
      if (context.chat.id != config.chat) return
      const {prompt} = store.data.chat
      const {message_id, text} = context.message
      const content = text.replace(/^\/\w+\s*/, '').trim()
      if (content) {
        const completion = await openai.chat.completions.create({
          model: config.openai.model,
          max_tokens: 512,
          messages: [prompt && {role: 'user', content: prompt}, {role: 'user', content}].filter(Boolean),
        })
        const reply = completion.choices[0].message.content
        if (reply) {
          await context.sendMessage(reply, {reply_to_message_id: message_id})
        }
      }
    })
}

export async function run() {}
