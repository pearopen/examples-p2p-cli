const cenc = require('compact-encoding')
const goodbye = require('graceful-goodbye')
const HyperDHT = require('hyperdht')
const crypto = require('hypercore-crypto')
const idEnc = require('hypercore-id-encoding')
const Identity = require('keet-identity-key')
const { command, arg, rest } = require('paparam')
const ProtomuxRPC = require('protomux-rpc')
const ProtomuxRpcClient = require('protomux-rpc-client')

const cmdServer = command('server',
  startServer
)

const cmdClient = command('client',
  arg('<rpcKey>', 'Rpc server public key'),
  rest('[24 words]', '24 words of identity mnemonic'),
  startClient
)

const cmd = command('basic-identity',
  cmdServer,
  cmdClient,
  () => console.log(cmd.help())
)

async function startServer () {
  const { mnemonic, identity } = await createIdentity()
  console.log(`24 words: ${mnemonic}`)

  const server = createRpcServer((payload) => {
    try {
      const message = Buffer.from(payload.message)
      const messageProof = Buffer.from(payload.messageProof, 'hex')

      const messageInfo = Identity.verify(messageProof, message)
      if (!messageInfo) throw new Error('Invalid proof')
      if (messageInfo.identityPublicKey.toString('hex') !== identity.identityPublicKey.toString('hex')) throw new Error('Invalid identity')
      return { result: 'Valid identity' }
    } catch (error) {
      console.log(error)
      return { error: `${error}` }
    }
  })
  await server.listen()
}

async function startClient () {
  const { rpcKey } = cmdClient.args
  const mnemonic = (cmdClient.rest || []).join(' ')

  const { deviceKeyPair, deviceProof } = await createIdentity(mnemonic)
  const message = 'Hello, world!'
  const messageProof = Identity.attestData(Buffer.from(message), deviceKeyPair, deviceProof)

  const client = createRpcClient(rpcKey)
  const { result, error } = await client.request(message, messageProof)
  if (error) throw new Error(error)
  console.log(result)
}

async function createIdentity (mnemonic) {
  mnemonic = mnemonic || Identity.generateMnemonic()
  const identity = await Identity.from({ mnemonic })
  const deviceKeyPair = crypto.keyPair()
  const deviceProof = await identity.bootstrap(deviceKeyPair.publicKey)
  return { mnemonic, identity, deviceKeyPair, deviceProof }
}

function createRpcServer (verifyHandler) {
  const dht = new HyperDHT()
  const rpcKey = dht.defaultKeyPair.publicKey
  console.log(`Rpc key: ${idEnc.normalize(rpcKey)}`)

  const server = dht.createServer()
  server.on('connection', (conn) => {
    const rpc = new ProtomuxRPC(conn, { id: rpcKey, valueEncoding: cenc.json })
    rpc.respond('verify', verifyHandler)
  })
  goodbye(() => server.close())
  return server
}

function createRpcClient (rpcKey) {
  const dht = new HyperDHT()
  const client = new ProtomuxRpcClient(dht)
  return {
    request: (message, messageProof) => {
      const payload = { message, messageProof: messageProof.toString('hex') }
      return client.makeRequest(rpcKey, 'verify', payload, { requestEncoding: cenc.json, responseEncoding: cenc.json })
    }
  }
}

cmd.parse(global.Pear?.app?.args)
