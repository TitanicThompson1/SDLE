import PeerId from 'peer-id'
import { client } from '../../index.js'

export async function status(req, res) {
    const peer = client.peer
    const status = peer.getStatus()

    return res.status(200).json({ "message": status })
}

export async function start(req, res) {
    const peer = client.peer

    // TODO: missing validation
    const { inviteToken } = req.body

    // Checks if invited
    if (inviteToken)
        await peer.start(inviteToken)
    else
        await peer.start()

    return res.status(200).json({ "message": "You are now online" })
}

export async function stop(req, res) {
    // TODO: missing validation
    throw new Error('Not implemented')
}

export async function subscribe(req, res) {
    const peer = client.peer
    
    // Subscription through usernames
    const { username } = req.body

    // Validation
    if (!peer.isOnline())
      return res.status(401).json({ error: "You are offline" });

    if (username === undefined)
        return res.status(400).json({ "error": "Username not provided" })

    // TODO: check if user is in the network (works if offline, doesn't work if inexistent)

    const alreadySub = await peer.subscribe(username)

    if (alreadySub)
        return res.status(200).json({ message: " Already followed user" })
    else 
        return res.status(201).json({ message: "Followed user" });
}

export async function unsubscribe(req, res) {
    const peer = client.peer

    const { username } = req.body
    
    // Validation
    if (!peer.isOnline())
        return res.status(401).json({ "error": "You are offline" })

    if (username === undefined)
        return res.status(400).json({ "error": "Username not provided" })
    
    // TODO: check if user is in the network (works if offline, doesn't work if inexistent)

    const alreadyUnsub = await peer.unsubscribe(username);

    if (alreadyUnsub)
        return res.status(200).json({ message: "Unfollowed user" });
    else 
        return res.status(201).json({ message: "You didn't follow the user" });
}

export async function post(req, res) {
    const peer = client.peer

    const { message } = req.body
    
    // Validation
    if (message === undefined)
        return res.status(400).json({ "error": "Message not provided" })

    await peer.send(message)

    return res.status(200).json({ "message": "Message successfuly sent" })
}