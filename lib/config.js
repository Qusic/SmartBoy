import fs from 'fs'

const file = process.argv[2] || 'config.json'

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
const config = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'}))

export default config
