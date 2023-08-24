import fs from 'fs'

const file = process.argv[2] || 'config.json'

/**
 * @type {{
 *  host: string;
 *  port: number;
 *  token: string;
 *  url: string;
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
 *    chat: string;
 *    ip: string;
 *  };
 * }}
 */
const config = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'}))

export default config
