import {Low, JSONFile} from 'lowdb'
import {Telegraf} from 'telegraf'
import Koa from 'koa'
import config from './config.js'

export const store = new Low(new JSONFile('data.json'))
export const bot = new Telegraf(config.token)
export const http = new Koa()
