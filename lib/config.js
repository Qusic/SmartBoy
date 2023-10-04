import fs from 'fs'

const file = process.argv[2] || 'config.json'

/**
 * @type {{
 *  host: string;
 *  port: number;
 *  token: string;
 *  url: string;
 *  admin: string;
 *  chat: string;
 *  store: {
 *    credential: string;
 *    table: string;
 *    partition: string;
 *  };
 *  openai: {
 *    url: string;
 *    token: string;
 *    model: string;
 *  }
 *  wukong: {
 *    ip: string;
 *  };
 * }}
 */
const config = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'}))

export default config
