import Koa from 'koa'
import {Low} from 'lowdb'
import {JSONFile} from 'lowdb/node'
import {OpenAI} from 'openai'
import {ProxyAgent} from 'proxy-agent'
import {Telegraf} from 'telegraf'

import config from './config.js'

export const bot = new Telegraf(config.token, {telegram: {agent: new ProxyAgent()}})
export const http = new Koa()
export const store = new Low(new JSONFile('data.json'), {})
export const openai = new OpenAI({baseURL: config.openai.url, apiKey: config.openai.token})
