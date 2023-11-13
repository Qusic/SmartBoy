import Koa from 'koa'
import {Low} from 'lowdb'
import {JSONFile} from 'lowdb/node'
import {ProxyAgent} from 'proxy-agent'
import {Telegraf} from 'telegraf'

import config from './config.js'

export const bot = new Telegraf(config.token, {telegram: {agent: new ProxyAgent()}})
export const http = new Koa()
export const store = new Low(new JSONFile('data.json'), {})
export const bing = async (data) => {
  try {
    const response = await fetch(config.bing, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
    })
    return await response.json()
  } catch (error) {
    return {text: error.toString()}
  }
}
