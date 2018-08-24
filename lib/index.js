const Controller = require('./controller')
const connector = require('./connector')
const script = require('./script')

const controller = new Controller(connector, script)
controller.spawn()
