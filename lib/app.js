import AzureTables from '@azure/data-tables'
import Koa from 'koa'
import {Low} from 'lowdb'
import {JSONFile} from 'lowdb/node'
import {Telegraf} from 'telegraf'

import config from './config.js'

class AzureTable {
  #client = AzureTables.TableClient.fromConnectionString(config.store.credential, config.store.table)
  #partition = config.store.partition
  #row = 'state'
  #property = 'value'

  async read() {
    try {
      const entity = await this.#client.getEntity(this.#partition, this.#row)
      return JSON.parse(entity[this.#property])
    } catch (error) {
      if (error instanceof AzureTables.RestError && error.statusCode == 404) return null
      throw error
    }
  }

  async write(data) {
    await this.#client.upsertEntity({
      partitionKey: this.#partition,
      rowKey: this.#row,
      [this.#property]: JSON.stringify(data),
    })
  }
}

export const bot = new Telegraf(config.token)
export const http = new Koa()
export const store = new Low(config.store ? new AzureTable() : new JSONFile('data.json'), {})
