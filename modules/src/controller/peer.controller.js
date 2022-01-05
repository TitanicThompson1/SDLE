export async function status(req, res) {
  const peer = req.app.get('peer')
  const status = peer.status

  return res.status(200).json({ message: status })
}

export async function start(req, res) {
  const peer = req.app.get('peer')

  // todo: missing validation
  const { inviteToken, privateKey } = req.body

  // TODO get InviteToken from storage with persistence
  const isNewNetwork = inviteToken === undefined

  if (!isNewNetwork) {
    if (!await peer.start(inviteToken)) { return res.status(400).json({ message: 'invalid token' }) }

    const isNewUser = privateKey === undefined

    if (isNewUser) {
      if (!await createNewUser(peer, req.app.get('peer').username)) { return res.status(409).json({ message: 'username already exists' }) }
    } else { await login(peer, req.app.get('peer').username, privateKey) }
  } else {
    // if the network is new, the user is also new, ignores the secret key
    peer.auth.createCredentials()
    peer.auth.createDatabase(req.app.get('peer').username)

    await peer.start()
  }

  return res.status(200).json({
    message: 'Peer started',
    auth: {
      publicKey: peer.auth.publicKey,
      privateKey: peer.auth.privateKey
    }
  })
}

export async function stop(req, res) {
  // TODO: missing validation
  throw new Error('Not implemented')
}

async function login(peer, username, privateKey) {
  // TODO verify with persistence if the credentials are valid

  // asks neighbors if the credentials are correct
  const { bestNeighbor: bestNeighborId, bestReply: credentialsCorrect } = await peer.protocols.checkCredentials(username, privateKey)
  if (!credentialsCorrect) { return false }

  // TODO additional measures (like ask to sign random string)

  // TODO not get the database right away, but check persistence first
  // and check the ID

  // gets the database from the neighbor
  const database = await peer.protocols.database(bestNeighborId)

  // sets it as the current database
  peer.auth.setDatabase(database)

  peer.auth.updateKeys(username, privateKey)

  return true
}

// creates a new user in the network
async function createNewUser(peer, username) {
  console.log(username)
  // asks neighbors if the username already exists
  const { bestNeighbor: bestNeighborId, bestReply: usernameAlreadyExists } = await peer.protocols.usernameExists(username)
  if (usernameAlreadyExists) { return false }

  // gets the database from the neighbor
  const database = await peer.protocols.database(bestNeighborId)

  // creates the credentials
  peer.auth.createCredentials()
  // TODO persistence

  // adds the user to the database
  database.set(username, peer.auth.publicKey)

  // sets it as the current database
  peer.auth.setDatabase(database)

  // floods the new user to the network
  peer.notices.publishDbPost(username, peer.auth.publicKey, peer.auth.db.id)

  return true
}

export async function subscribe(req, res) {
  const peer = req.app.get('peer')

  // Subscription through usernames
  const { username } = req.body

  // Validation
  if (!peer.isOnline()) { return res.status(401).json({ error: 'You are offline' }) }

  if (username === undefined) { return res.status(400).json({ error: 'Username not provided' }) }

  // TODO: check if user is in the network (works if offline, doesn't work if inexistent)

  if (!await peer.subscribe(username)) { return res.status(200).json({ message: ' Already followed user' }) } else { return res.status(201).json({ message: 'Followed user' }) }
}

export async function unsubscribe(req, res) {
  const peer = req.app.get('peer')

  const { username } = req.body

  // Validation
  if (!peer.isOnline()) { return res.status(401).json({ error: 'You are offline' }) }

  if (username === undefined) { return res.status(400).json({ error: 'Username not provided' }) }

  // TODO: check if user is in the network (works if offline, doesn't work if inexistent)

  if (await peer.unsubscribe(username)) { return res.status(200).json({ message: 'Unfollowed user' }) } else { return res.status(201).json({ message: "You didn't follow the user" }) }
}

export async function post(req, res) {
  const peer = req.app.get('peer')

  const { message } = req.body

  // Validation
  if (message === undefined) { return res.status(400).json({ error: 'Message not provided' }) }

  await peer.send(message)

  return res.status(200).json({ message: 'Message sent' })
}

export function token(req, res) {
  const peer = req.app.get('peer')

  if (peer.status !== 'online') {
    return res.status(406).json({ message: 'Peer is not online' })
  }

  return res.status(200).json({ token: peer.token() })
}

export function database(req, res) {
  const peer = req.app.get('peer')

  if (peer.status !== 'online') {
    return res.status(406).json({ message: 'Peer is not online' })
  }

  return res.status(200).json({ database: peer.auth.db })
}
