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
    storage = global.Pear?.app?.storage || './storage',
    invite,
    name = `User ${Date.now()}`
  } = cmd.flags

  const store = new Corestore(path.join(storage, 'store'))
  const swarm = new Hyperswarm()
  swarm.on('connection', (conn) => store.replicate(conn))
  const myDrivePath = path.join(storage, 'my-drive')
  const sharedDrivesPath = path.join(storage, 'shared-drives')
  const room = new DriveRoom(myDrivePath, sharedDrivesPath, store, swarm, invite, { name })

  goodbye(async () => {
    await room.close()
    await swarm.destroy()
    await store.close()
  })

  await store.ready()
  await room.ready()
  console.log(`Invite: ${await room.getInvite()}`)

  await fs.mkdir(myDrivePath, { recursive: true })
  await fs.mkdir(sharedDrivesPath, { recursive: true })
  console.log(`My drive: ${myDrivePath}`)
  console.log(`Shared drives: ${sharedDrivesPath}`)
}

cmd.parse(global.Pear?.app?.args)
