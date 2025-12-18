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
  flag('--reset', 'Reset'),
  main
)

async function main () {
  const storage = cmd.flags.storage || global.Pear?.app?.storage || 'storage'
  const corestorePath = path.join(storage, 'corestore')
  const invite = cmd.flags.invite
  const name = cmd.flags.name || `User ${Date.now()}`
  if (cmd.flags.reset) {
    await fs.promises.rm(corestorePath, { recursive: true, force: true })
  }

  const store = new Corestore(corestorePath)
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

  await fs.mkdir(myDrivePath, { recursive: true })
  await fs.mkdir(sharedDrivesPath, { recursive: true })

  console.log('Storage', storage)
  console.log('Name', name)
  console.log('Invite', await room.getInvite())
  console.log('My drive', myDrivePath)
  console.log('Shared drives', sharedDrivesPath)
}

cmd.parse(global.Pear?.app?.args)
