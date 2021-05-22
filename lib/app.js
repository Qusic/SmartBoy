import {Telegraf} from 'telegraf'
import Redis from 'redis'
import Koa from 'koa'
import {promisify} from 'util'
import config from './config.js'

export const bot = new Telegraf(config.token)
export const http = new Koa()
export const store = Redis.createClient(config.redis)
for (const method of [
  'get',
  'set',
  'mget',
  'mset',
  'del',
  'hget',
  'hmget',
  'hgetall',
  'hset',
  'hincrby',
  'sadd',
  'smembers',
  'quit',
]) {
  store[method] = promisify(store[method])
}
