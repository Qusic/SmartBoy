import fs from 'fs'

/**
 * @type {{
 *  token: string;
 *  url: string;
 *  wukong: {
 *    chat: string;
 *    ip: string;
 *  };
 * }}
 */
const config = JSON.parse(fs.readFileSync('config.json', {encoding: 'utf8'}))

export default config
