import {bot, http, store} from '../app.js'
import * as util from '../util.js'
import config from '../config.js'
import Netease from 'NeteaseCloudMusicApi'
import child_process from 'child_process'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'

const wukong = {
  constant: {
    directory: 'wukong',
    stream: 'play.m3u8',
  },
  state: {
    users: [],
    names: {},
    cookies: {},
    tracks: {},
    pending: {},
    message: null,
    running: false,
    serving: false,
    handle: () => {},
  },
  async load(user) {
    return JSON.parse((await store.hget(util.key('wukong'), user)) || JSON.stringify({netease: {}}))
  },
  async save(user, data) {
    return await store.hset(util.key('wukong'), user, JSON.stringify(data))
  },
  async tracks(playlist, cookie) {
    const response = await Netease.playlist_detail({
      id: playlist,
      cookie: cookie,
      realIP: config.wukong.ip,
    })
    return response.body.playlist.tracks.map((track) => ({
      id: track.id,
      name: `${track.ar.map((item) => item.name).join('/')} - ${track.name}`,
    }))
  },
  async url(track, cookie) {
    const response = await Netease.song_url({
      id: track,
      cookie: cookie,
      realIP: config.wukong.ip,
    })
    return response.body.data.sort((a, b) => b.br - a.br).shift().url
  },
  async play(url) {
    await new Promise((resolve, reject) => {
      this.state.handle()
      const ffmpeg = child_process.spawn(
        'ffmpeg',
        [
          '-loglevel',
          'warning',
          '-re',
          '-i',
          url,
          '-map',
          '0:a',
          '-map',
          '0:a',
          '-b:a:0',
          '320k',
          '-b:a:1',
          '160k',
          '-f',
          'hls',
          '-hls_time',
          '2',
          '-hls_list_size',
          '5',
          '-hls_delete_threshold',
          '1',
          '-hls_flags',
          '+append_list+omit_endlist+delete_segments',
          '-var_stream_map',
          'a:0,name:hd a:1,name:sd',
          '-master_pl_name',
          wukong.constant.stream,
          path.join(wukong.constant.directory, '%v.m3u8'),
        ],
        {stdio: ['ignore', 'ignore', 'pipe']}
      )
      const buffer = []
      ffmpeg.stderr.on('data', (chunk) => buffer.push(chunk))
      ffmpeg.on('error', reject)
      ffmpeg.on('exit', (code, signal) => {
        if (code == 0) {
          resolve()
        } else {
          const string = Buffer.concat(buffer).toString().trim()
          reject(new Error(`code=${code} signal=${signal}\n${string}`))
        }
      })
      this.state.handle = () => {
        resolve()
        ffmpeg.kill()
      }
    })
  },
  async interrupt() {
    this.state.handle()
    this.state.handle = () => {}
  },
  async notify(user, track, link) {
    if (user && track && link) {
      const escape = (string) => string.replace(/[_*[\]()~`>#+-=|{}.!\\]/g, '\\$&')
      const text = [
        `🎵\\[${escape(user)}\\][${escape(track)}](${link})`,
        `🎧[手机听](${config.url}/wukong/${wukong.constant.stream}) [电脑听](${config.url}/wukong/)`,
      ].join('\n')
      const extra = {parse_mode: 'MarkdownV2', disable_notification: true}
      if (this.state.message) {
        await bot.telegram.editMessageText(config.wukong.chat, this.state.message, null, text, extra)
      } else {
        const message = await bot.telegram.sendMessage(config.wukong.chat, text, extra)
        this.state.message = message.message_id
        await bot.telegram.pinChatMessage(config.wukong.chat, this.state.message, extra)
      }
    } else {
      if (this.state.message) {
        await bot.telegram.unpinChatMessage(config.wukong.chat, this.state.message)
        this.state.message = null
      }
    }
  },
  async reset() {
    await fsPromises.rm(wukong.constant.directory, {recursive: true, force: true})
    await fsPromises.mkdir(wukong.constant.directory, {recursive: true})
  },
  async clean() {
    const list = async (file) => {
      return (await fsPromises.readFile(path.join(wukong.constant.directory, file), {encoding: 'utf8'}))
        .split('\n')
        .filter((item) => item && !item.startsWith('#'))
    }
    const remove = async (file) => {
      return await fsPromises.rm(path.join(wukong.constant.directory, file), {recursive: true, force: true})
    }
    const master = wukong.constant.stream
    const variations = await list(master)
    const segments = (await Promise.all(variations.map(list))).flatMap((items) => items)
    const files = [master, ...variations, ...segments]
    const map = {}
    files.forEach((file) => (map[file] = true))
    const deletions = (await fsPromises.readdir(wukong.constant.directory)).filter((file) => !map[file])
    await Promise.all(deletions.map(remove))
  },
  async run() {
    if (this.state.running) return
    this.state.running = true
    this.state.serving = true
    await this.reset()
    while (this.state.serving) {
      if (!this.state.users.length) break
      const user = this.state.users.shift()
      if (!user) continue
      this.state.users.push(user)
      const track = this.state.tracks[user].shift()
      if (!track) continue
      this.state.tracks[user].push(track)
      const name = this.state.names[user]
      const cookie = this.state.cookies[user]
      const link = `https://music.163.com/song?id=${track.id}`
      await this.notify(name, track.name, link)
      try {
        const url = await this.url(track.id, cookie)
        if (!url) {
          throw new Error('音频链接为空')
        }
        this.state.serving = false
        await this.play(url)
      } catch (error) {
        await bot.telegram.sendMessage(config.wukong.chat, `❌来自${name}的歌曲播放失败\n${link}\n${error}`, {
          disable_notification: true,
        })
      } finally {
        await this.clean()
      }
    }
    await this.notify()
    await this.reset()
    await bot.telegram.sendMessage(config.wukong.chat, '没人在听了，今天的悟空到此结束。谢谢大家～～')
    this.state.users = []
    this.state.names = {}
    this.state.cookies = {}
    this.state.tracks = {}
    this.state.running = false
    this.state.serving = false
  },
  async command(chat, user, condition, handler) {
    if (chat != config.wukong.chat) return
    if (this.state.users.includes(user) != condition) return
    if (this.state.pending[user]) return
    this.state.pending[user] = true
    await handler()
    delete this.state.pending[user]
  },
}

export async function command() {
  return [
    {
      command: 'wkset',
      description: '更新悟空歌单ID和Cookie',
    },
    {
      command: 'wkjoin',
      description: '加入悟空',
    },
    {
      command: 'wkrefresh',
      description: '刷新歌曲列表',
    },
    {
      command: 'wkshuffle',
      description: '随机歌曲列表',
    },
    {
      command: 'wkleave',
      description: '离开悟空',
    },
    {
      command: 'wknext',
      description: '悟空切歌',
    },
  ]
}

export async function scene() {
  return []
}

export async function setup() {
  bot
    .command('wkset', async (context) => {
      const user = context.from.id
      const data = await wukong.load(user)
      const reply = []
      const extract = (types) => {
        const {text, entities} = context.message
        if (text && entities) {
          const entity = entities.find((entity) => types.includes(entity.type))
          if (entity) {
            return text.substr(entity.offset, entity.length)
          }
        }
      }
      const code = extract(['code', 'pre'])
      const url = extract(['url'])
      if (code) {
        data.netease.cookie = code
        reply.push('网易云Cookie已保存。')
      }
      if (url && url.includes('playlist')) {
        const match = url.match(/[?&]id=(\d+)/)
        if (match) {
          data.netease.playlist = match[1]
          reply.push('悟空歌单ID已更新！')
        }
      }
      if (reply.length) {
        await wukong.save(user, data)
        await context.reply(reply.join(''), {reply_to_message_id: context.message.message_id})
      }
    })
    .command('wkjoin', async (context) => {
      const user = context.from.id
      await wukong.command(context.chat.id, user, false, async () => {
        const data = await wukong.load(user)
        const extra = {reply_to_message_id: context.message.message_id}
        if (data.netease.cookie && data.netease.playlist) {
          try {
            const tracks = await wukong.tracks(data.netease.playlist, data.netease.cookie)
            if (tracks && tracks.length) {
              wukong.state.users.push(user)
              wukong.state.names[user] = context.from.username
              wukong.state.cookies[user] = data.netease.cookie
              wukong.state.tracks[user] = util.shuffle(tracks)
              await context.reply(`欢迎 @${context.from.username} 带着${tracks.length}首歌进入了悟空！！！`)
              wukong.run()
            } else {
              await context.reply('你的歌单列表好像是空的。。', extra)
            }
          } catch (error) {
            await context.reply(`获取你的歌单列表失败了。。${error}`, extra)
          }
        } else {
          await context.reply('你还没有设置Cookie和歌单！发送悟空关键词加上代码块或歌单链接来设置。', extra)
        }
      })
    })
    .command('wkrefresh', async (context) => {
      const user = context.from.id
      await wukong.command(context.chat.id, user, true, async () => {
        const data = await wukong.load(user)
        const extra = {reply_to_message_id: context.message.message_id}
        if (data.netease.cookie && data.netease.playlist) {
          try {
            const tracks = await wukong.tracks(data.netease.playlist, data.netease.cookie)
            if (tracks && tracks.length) {
              wukong.state.cookies[user] = data.netease.cookie
              wukong.state.tracks[user] = util.shuffle(tracks)
              await context.reply(`歌单刷新成功，现在你的列表里有${tracks.length}首歌！`, extra)
            } else {
              await context.reply('你的歌单列表好像是空的。。', extra)
            }
          } catch (error) {
            await context.reply(`获取你的歌单列表失败了。。${error}`, extra)
          }
        } else {
          await context.reply('你还没有设置Cookie和歌单！发送悟空关键词加上代码块或歌单链接来设置。', extra)
        }
      })
    })
    .command('wkshuffle', async (context) => {
      const user = context.from.id
      await wukong.command(context.chat.id, user, true, async () => {
        util.shuffle(wukong.state.tracks[user])
        await context.reply('歌单随机成功！', {reply_to_message_id: context.message.message_id})
      })
    })
    .command('wkleave', async (context) => {
      const user = context.from.id
      await wukong.command(context.chat.id, user, true, async () => {
        const index = wukong.state.users.indexOf(user)
        if (index != -1) {
          wukong.state.users.splice(index, 1)
          delete wukong.state.names[user]
          delete wukong.state.cookies[user]
          delete wukong.state.tracks[user]
        }
        await context.reply('再见！！', {reply_to_message_id: context.message.message_id})
      })
    })
    .command('wknext', async (context) => {
      await wukong.command(context.chat.id, context.from.id, true, async () => {
        wukong.interrupt()
      })
    })
  http.use(async (context, next) => {
    const match = context.path.match(/^\/wukong(\/(.*))?$/)
    if (!match) return next()
    const segment = match[2]
    if (segment == undefined) {
      context.status = 301
      context.redirect('wukong/')
    } else if (segment == '') {
      try {
        const file = new URL('../resources/wukong.html', import.meta.url)
        const stat = await fsPromises.stat(file)
        context.type = path.extname(file.pathname)
        context.length = stat.size
        context.body = fs.createReadStream(file)
      } catch {
        context.status = 404
      }
    } else if (/^\w+\.(m3u8|ts)$/.test(segment)) {
      try {
        const file = path.join(wukong.constant.directory, segment)
        const stat = await fsPromises.stat(file)
        if (stat.isFile()) {
          context.type = path.extname(file)
          context.length = stat.size
          context.body = fs.createReadStream(file)
          wukong.state.serving = true
        }
      } catch {
        context.status = 404
      }
    }
  })
}

export async function run() {}
