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
    return response.body.playlist.tracks.map((track) => track.id)
  },
  async url(track, cookie) {
    const response = await Netease.song_url({
      id: track,
      cookie: cookie,
      realIP: config.wukong.ip,
    })
    return JSON.parse(response.body.toString())
      .data.sort((a, b) => b.br - a.br)
      .shift().url
  },
  async play(url) {
    await new Promise((resolve, reject) => {
      this.state.handle()
      const curl = child_process.spawn('curl', ['-LSs', url], {stdio: ['ignore', 'pipe', 'pipe']})
      const ffmpeg = child_process.spawn(
        'ffmpeg',
        [
          '-loglevel',
          'warning',
          '-re',
          '-i',
          'pipe:0',
          '-map',
          '0:a',
          '-b:a',
          '320k',
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
          path.join(wukong.constant.directory, wukong.constant.stream),
        ],
        {stdio: [curl.stdout, 'ignore', 'pipe']}
      )
      const buffers = [[], []]
      curl.stderr.on('data', (chunk) => buffers[0].push(chunk))
      ffmpeg.stderr.on('data', (chunk) => buffers[1].push(chunk))
      curl.on('error', reject)
      ffmpeg.on('error', reject)
      ffmpeg.on('exit', (code, signal) => {
        if (code == 0) {
          resolve()
        } else {
          reject(
            new Error(
              [
                `code=${code} signal=${signal}`,
                ...buffers.map((buffer) => Buffer.concat(buffer).toString().trim()).filter(Boolean),
              ].join('\n')
            )
          )
        }
      })
      this.state.handle = () => {
        resolve()
        curl.kill()
        ffmpeg.kill()
      }
    })
  },
  async interrupt() {
    await this.reset(false)
    this.state.handle()
    this.state.handle = () => {}
  },
  async reset(hard) {
    if (hard) {
      await fsPromises.rm(wukong.constant.directory, {recursive: true, force: true})
      await fsPromises.mkdir(wukong.constant.directory, {recursive: true})
    } else {
      await Promise.all(
        (await fsPromises.readdir(wukong.constant.directory))
          .filter((file) => file != wukong.constant.stream)
          .map((file) => fsPromises.rm(path.join(wukong.constant.directory, file), {recursive: true, force: true}))
      )
    }
  },
  async run() {
    if (this.state.running) return
    this.state.running = true
    this.state.serving = true
    await this.reset(true)
    while (this.state.serving) {
      if (!this.state.users.length) break
      const user = this.state.users.shift()
      if (!user) continue
      this.state.users.push(user)
      const track = this.state.tracks[user].shift()
      if (!track) continue
      this.state.tracks[user].push(track)
      const name = this.state.names[user].replace('_', '\\_')
      const cookie = this.state.cookies[user]
      const link = `https://music.163.com/song?id=${track}`
      try {
        const url = await this.url(track, cookie)
        if (!url) {
          throw new Error('音频链接为空')
        }
        await bot.telegram.sendMessage(
          config.wukong.chat,
          [
            `🎵即将播放来自${name}的[歌曲](${link})`,
            `🎧[手机听](${config.url}/wukong/${wukong.constant.stream}) [电脑听](${config.url}/wukong/)`,
          ].join('\n'),
          {
            parse_mode: 'MarkdownV2',
            disable_notification: true,
          }
        )
        this.state.serving = false
        await this.play(url)
      } catch (error) {
        await bot.telegram.sendMessage(config.wukong.chat, `❌来自${name}的[歌曲](${link})播放失败\n${error}`, {
          parse_mode: 'MarkdownV2',
        })
      }
    }
    await this.reset(true)
    await bot.telegram.sendMessage(config.wukong.chat, '没人在听了，今天的悟空到此结束。谢谢大家～～')
    this.state.users = []
    this.state.names = {}
    this.state.cookies = {}
    this.state.tracks = {}
    this.state.running = false
    this.state.serving = false
  },
  async command(chat, user, condition, handler, next) {
    if (chat != config.wukong.chat) return next()
    if (this.state.users.includes(user) != condition) return next()
    if (this.state.pending[user]) return next()
    this.state.pending[user] = true
    await handler()
    delete this.state.pending[user]
  },
}

export async function scene() {
  return []
}

export async function setup() {
  bot
    .hears(/(wukong|wk|悟空)/iu, async (context, next) => {
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
      } else {
        return next()
      }
    })
    .hears(/(?=.*(wukong|wk|悟空))(?=.*(开始|播放|加入|我也|来了|start|play|join))/iu, async (context, next) => {
      const user = context.from.id
      await wukong.command(
        context.chat.id,
        user,
        false,
        async () => {
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
        },
        next
      )
    })
    .hears(/(?=.*(wukong|wk|悟空))(?=.*(刷新|更新|歌单|update|reload|refresh))/iu, async (context, next) => {
      const user = context.from.id
      await wukong.command(
        context.chat.id,
        user,
        true,
        async () => {
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
        },
        next
      )
    })
    .hears(/(?=.*(wukong|wk|悟空))(?=.*(退出|停止|走了|leave|stop|bye))/iu, async (context, next) => {
      const user = context.from.id
      await wukong.command(
        context.chat.id,
        user,
        true,
        async () => {
          const index = wukong.state.users.indexOf(user)
          if (index != -1) {
            wukong.state.users.splice(index, 1)
            delete wukong.state.names[user]
            delete wukong.state.cookies[user]
            delete wukong.state.tracks[user]
          }
          await context.reply('再见！！', {reply_to_message_id: context.message.message_id})
        },
        next
      )
    })
    .hears(/(换歌|切歌|下一首|下一曲)/iu, async (context, next) => {
      await wukong.command(
        context.chat.id,
        context.from.id,
        true,
        async () => {
          wukong.interrupt()
        },
        next
      )
    })
  http.use(async (context, next) => {
    const match = context.path.match(/^\/wukong(\/(.*))?$/)
    if (!match) return next()
    const segment = match[2]
    if (segment == undefined) {
      context.status = 301
      context.redirect('wukong/')
    } else if (segment == '') {
      const library = 'https://cdn.jsdelivr.net/npm/hls.js/dist/hls.light.min.js'
      const head = `<head><script src="${library}"></script></head>`
      const element = '<audio autoplay controls/>'
      const script = [
        'const hls = new Hls();',
        'hls.attachMedia(document.querySelector("audio"));',
        `hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource("${wukong.constant.stream}"));`,
      ].join('')
      const body = `<body>${element}<script>${script}</script></body>`
      const html = `<!DOCTYPE html><html>${head}${body}</html>`
      context.body = html
    } else if (/^\w+\.(m3u8|ts)$/.test(segment)) {
      try {
        const file = path.join(wukong.constant.directory, segment)
        const stat = await fsPromises.stat(file)
        if (stat.isFile()) {
          context.type = path.extname(file)
          context.length = stat.size
          context.body = fs.createReadStream(file)
          wukong.state.serving = true
        } else {
          context.status = 404
        }
      } catch {
        context.status = 404
      }
    } else {
      context.status = 404
    }
  })
}

export async function run() {}
