# Basic Identity

- P2P basic identity app with rpc server client to verify identity of message

- Stack: holepunch, bare, pear, hyperdht, protomux-rpc, protomux-rpc-client, keet-identity-key

## Usage

```shell
npm i

# start server + print rpcKey and 24 words
npm start server

# request to verify identity
npm start client <rpcKey>             # Invalid identity
npm start client <rpcKey> <24 words>  # Valid identity
```

## Build Pear app
```shell
npm i

pear stage <channel>
pear seed <channel>

# start server + print rpcKey and 24 words
pear run <pear-link> server

# request to verify identity
pear run <pear-link> client <rpcKey>             # Invalid identity
pear run <pear-link> client <rpcKey> <24 words>  # Valid identity
```
