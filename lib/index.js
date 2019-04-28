const Controller = require('./controller')
const Connector = require('./connector')
const Script = require('./script')

const token = process.env.TOKEN
const production = !!token
const local = !production
const debug = !production

const connector = Connector(token)
const script = Script(local)
const controller = new Controller(connector, script, debug)
controller.spawn()
