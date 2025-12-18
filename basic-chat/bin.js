const Corestore = require('corestore')
const fs = require('fs').promises
const goodbye = require('graceful-goodbye')
const Hyperswarm = require('hyperswarm')
const { command, flag } = require('paparam')
const path = require('path')
const process = require('process')
const readline = require('readline')
const { isNode } = require('which-runtime')

const ChatRoom = require('./index')

const cmd = command('basic-chat',
  flag('--storage|-s <storage>', 'Storage path'),
  flag('--invite|-i <invite>', 'Room invite'),
  flag('--name|-n <name>', 'Your name'),
  flag('--reset', 'Reset'),
  main
)

async function main () {
  const storage = path.join(cmd.flags.storage || global.Pear?.app?.storage || 'storage', 'corestore')
  const invite = cmd.flags.invite
  const name = cmd.flags.name || `User ${Date.now()}`
  if (cmd.flags.reset) {
    await fs.rm(storage, { recursive: true, force: true })
  }

  const store = new Corestore(storage)
  const swarm = new Hyperswarm()
  swarm.on('connection', (conn) => store.replicate(conn))

  const room = new ChatRoom(store, swarm, invite)
  room.on('update', () => getMessages())

  goodbye(async () => {
    await room.close()
    await swarm.destroy()
    await store.close()
  })

  await store.ready()
  await room.ready()
  await getMessages()

  console.log('Storage', storage)
  console.log('Name', name)
  console.log('Invite', await room.getInvite())

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  rl.on(isNode ? 'line' : 'data', async (line) => {
    await room.addMessage(line.trim() || '(Empty)', { name, at: Date.now() })
    rl.prompt()
  }).prompt()

  async function getMessages () {
    const messages = await room.getMessages()
    messages
      .sort((a, b) => a.info.at - b.info.at)
      .slice(-5) // last 5 messages
      .forEach((msg) => {
        console.log(`- ${msg.text} ~ ${msg.info.name} ~ ${new Date(msg.info.at).toISOString()} ~ ${msg.id}`)
      })
  }
}

cmd.parse(global.Pear?.app?.args)
