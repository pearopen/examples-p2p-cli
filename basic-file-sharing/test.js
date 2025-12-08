const test = require('brittle')
const Corestore = require('corestore')
const fs = require('fs').promises
const idEnc = require('hypercore-id-encoding')
const createTestnet = require('hyperdht/testnet')
const Hyperswarm = require('hyperswarm')
const path = require('path')

const DriveRoom = require('./index')

test('basic', async t => {
  const { store, swarm, store2, swarm2 } = await setup(t, 2)

  const room1 = await createDriveRoom(t, store, swarm)
  const invite = await room1.getInvite()
  const room2 = await createDriveRoom(t, store2, swarm2, invite)

  const drives = await getDrives(room2)
  t.is(drives.length, 2)

  await fs.mkdir(room1.myDrivePath, { recursive: true })
  await fs.writeFile(path.join(room1.myDrivePath, 'hello.txt'), 'Hello, world!', 'utf8')

  const file = await getFile(room2, idEnc.normalize(room1.myDrive.key))
  t.is(file, 'Hello, world!')
})

/** @type {function(DriveRoom)} */
async function getFile (room, key) {
  const file = await fs.readFile(path.join(room.sharedDrivesPath, key, 'hello.txt'), 'utf8')
    .catch((err) => {
      if (err.code === 'ENOENT') return null
      throw err
    })
  if (file) return file

  await new Promise(resolve => setTimeout(resolve, 100))
  return getFile(room, key)
}

/** @type {function(DriveRoom)} */
async function getDrives (room) {
  const drives = await room.getDrives()
  if (drives.length === 2) return drives

  await new Promise(resolve => setTimeout(resolve, 100))
  return getDrives(room)
}

async function createDriveRoom (t, store, swarm, invite) {
  const tmp = await t.tmp()
  const myDrivePath = path.join(tmp, 'my-drive')
  const sharedDrivesPath = path.join(tmp, 'shared-drives')
  const room = new DriveRoom(myDrivePath, sharedDrivesPath, store, swarm, invite)
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
