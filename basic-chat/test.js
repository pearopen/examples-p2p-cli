const test = require('brittle')
const Corestore = require('corestore')
const createTestnet = require('hyperdht/testnet')
const Hyperswarm = require('hyperswarm')

const ChatRoom = require('./index')

test('basic', async t => {
  const { store, swarm, store2, swarm2 } = await setup(t, 2)

  const room1 = await createChatRoom(t, store, swarm)
  const invite = await room1.getInvite()
  const room2 = await createChatRoom(t, store2, swarm2, invite)

  await room1.addMessage('Hello from user 1', { name: 'User 1', at: Date.now() })

  const messages = await getMessages(room2)
  t.is(messages.length, 1)
  t.is(messages[0].text, 'Hello from user 1')
  t.is(messages[0].info.name, 'User 1')
})

/** @type {function(ChatRoom)} */
async function getMessages (room) {
  const messages = await room.getMessages()
  if (messages.length) return messages

  await new Promise(resolve => setTimeout(resolve, 100))
  return getMessages(room)
}

async function createChatRoom (t, store, swarm, invite) {
  const room = new ChatRoom(store, swarm, invite)
  t.teardown(() => room.close())
  await room.ready()
  return room
}

async function setup (t, n = 1, network) {
  const res = network ?? (await setupTestnet(t))
  const { bootstrap } = res

  for (let step = 1; step <= n; step++) {
    const storage = await t.tmp()
    const store = new Corestore(storage)
    t.teardown(() => store.close(), { order: 200 })
    const swarm = new Hyperswarm({ bootstrap })
    t.teardown(() => swarm.destroy(), { order: 100 })

    swarm.on('connection', (conn) => store.replicate(conn))

    const nstring = step > 1 ? step : ''
    res[`storage${nstring}`] = storage
    res[`store${nstring}`] = store
    res[`swarm${nstring}`] = swarm
  }

  return res
}

async function setupTestnet (t) {
  const testnet = await createTestnet()
  t.teardown(() => testnet.destroy(), { order: 300 })
  const bootstrap = testnet.bootstrap
  return { testnet, bootstrap }
}
