const Controller = require('./controller')
const Connector = require('./connector')
const Script = require('./script')

const debug = !!process.env.DEBUG
const local = !!process.env.LOCAL
const token = process.env.TOKEN

const connector = Connector(token)
const script = Script(local)
const controller = new Controller(connector, script, debug)
controller.spawn()
