# Basic Chat

- P2P basic chat app running in cli terminal

- Stack: holepunch, bare, pear, autobase, hyperdb, blind-pairing, hyperswarm, corestore

## Usage

```shell
npm i

# user1: create room + print invite
npm start -- --storage /tmp/user1 --name user1

# user2: join room
npm start -- --storage /tmp/user2 --name user2 --invite <invite>
```

## Build Pear app
```shell
npm i

pear stage <channel>
pear seed <channel>

# user1: create room + print invite
pear run <pear-link> --storage /tmp/user1 --name user1

# user2: join room
pear run <pear-link> --storage /tmp/user2 --name user2 --invite <invite>
```
