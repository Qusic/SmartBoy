import Redis from 'redis'
import {promisify} from 'util'

const store = Redis.createClient(process.env.REDIS)
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

export default store
