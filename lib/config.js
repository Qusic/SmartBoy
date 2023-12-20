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
 *  openai: {
 *    client: import('openai').ClientOptions;
 *    chat: import('openai').OpenAI.ChatCompletionCreateParamsBase;
 *  };
 *  wukong: {
 *    ip: string;
 *  };
 * }}
 */
const config = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'}))

export default config
