const Corestore = require('corestore')
const goodbye = require('graceful-goodbye')
const Hyperswarm = require('hyperswarm')
const { command, flag } = require('paparam')
const process = require('process')
const readline = require('readline')
const { isNode } = require('which-runtime')

const ChatRoom = require('./index')

const cmd = command('basic-chat',
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

  const store = new Corestore(storage)
  goodbye(() => store.close(), 20)
  await store.ready()

  const swarm = new Hyperswarm()
  swarm.on('connection', (conn) => store.replicate(conn))
  goodbye(() => swarm.destroy(), 10)

  const room = new ChatRoom(store, swarm, invite)
  goodbye(() => room.close())
  room.on('update', () => getMessages())

  await room.ready()
  console.log(`Invite: ${await room.getInvite()}`)
  await getMessages()

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
