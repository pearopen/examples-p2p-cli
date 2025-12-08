const Corestore = require('corestore')
const fs = require('fs').promises
const goodbye = require('graceful-goodbye')
const Hyperswarm = require('hyperswarm')
const { command, flag } = require('paparam')
const path = require('path')

const DriveRoom = require('./index')

const cmd = command('basic-file-sharing',
  flag('--storage|-s <storage>', 'Storage path'),
  flag('--invite|-i <invite>', 'Room invite'),
  flag('--name|-n <name>', 'Your name'),
  main
)

async function main () {
  const {
    storage = './storage',
    invite,
    name = `User ${Date.now()}`
  } = cmd.flags

  const store = new Corestore(path.join(storage, 'store'))
  goodbye(() => store.close(), 20)
  await store.ready()

  const swarm = new Hyperswarm()
  swarm.on('connection', (conn) => store.replicate(conn))
  goodbye(() => swarm.destroy(), 10)

  const myDrivePath = path.join(storage, 'my-drive')
  const sharedDrivesPath = path.join(storage, 'shared-drives')
  console.log(`My drive: ${myDrivePath}`)
  console.log(`Shared drives: ${sharedDrivesPath}`)
  await fs.mkdir(myDrivePath, { recursive: true })
  await fs.mkdir(sharedDrivesPath, { recursive: true })

  const room = new DriveRoom(myDrivePath, sharedDrivesPath, store, swarm, invite, { name })
  goodbye(() => room.close())

  await room.ready()
  console.log(`Invite: ${await room.getInvite()}`)
}

cmd.parse(global.Pear?.app?.args)
