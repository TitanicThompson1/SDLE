import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import Message from '../message/index.js'
import topics from '../message/topics.js'

// notices are messages that are sent to all the network
export default class Notices {
  constructor(peer) {
    this.peer = peer
  }

  subscribeAll() {
    this._subscribeNotice(
      topics.topic(topics.prefix.NOTICE, 'db', 'post'),
      this._handleDbPost
    )
    this._subscribeNotice(
      topics.topic(topics.prefix.NOTICE, 'db', 'delete'),
      this._handleDbDelete
    )
  }

  async publishDbPost(username, publicKey, databaseId) {
    await this.publish(topics.topic(topics.prefix.NOTICE, 'db', 'post'), {
      username,
      publicKey,
      databaseId
    })
  }

  async publishDbDelete(username, databaseId) {
    await this.publish(topics.topic(topics.prefix.NOTICE, 'db', 'delete'), {
      username,
      databaseId
    }, true)
  }

  async publish(channel, body, sign = false) {
    // todo create a specific build for a notice
    const message = this.peer.messageBuilder.build(body, 'notice', sign)
    console.log(`publishing to ${channel}: ${JSON.stringify(message)}`)
    await this.peer.libp2p.pubsub.publish(
      channel,
      uint8ArrayFromString(JSON.stringify(message))
    )
  }

  _subscribeNotice(channel, handler) {
    this.peer.libp2p.pubsub.on(channel, handler.bind(this))
    this.peer.libp2p.pubsub.subscribe(channel)
  }

  _handleDbPost(msg) {
    console.log('received notice:db:post')

    const json = JSON.parse(uint8ArrayToString(msg.data))
    const message = Message.fromJson(json)

    // TODO accept IDs that are not the one exactly above
    //     if it is even higher, question about the updated database
    //     if it is lower, do something as well

    const { username, publicKey, databaseId } = message.data
    if (databaseId !== this.peer.authManager.getDatabaseId() + 1) {
      return
    }

    this.peer.authManager.setEntry(username, publicKey)
  }

  _handleDbDelete(msg) {
    console.log('received notice:db:delete')

    const json = JSON.parse(uint8ArrayToString(msg.data))
    const message = Message.fromJson(json)

    if (!this.peer.messageBuilder.isSigned(message)) {
      console.log(`Message by ${message._metadata.owner} is not signed`)
      return
    }

    const { username, databaseId } = message.data
    if (databaseId !== this.peer.authManager.getDatabaseId() + 1) {
      return
    }

    this.peer.authManager.delete(username)
  }
}
