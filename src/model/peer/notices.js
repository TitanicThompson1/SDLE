import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import debug from 'debug'
import Message, { messagedebuger } from '../message/index.js'
import topics from '../message/topics.js'
import peerConfig from '../../config/peer.js'
// eslint-disable-next-line no-unused-vars
import Peer from './index.js'

const noticesdebugger = debug('tp2p:notices')

// notices are messages that are sent to all the network
export default class Notices {
  /**
   * Creates the notice manager for a peer.
   *
   * @param {Peer} peer the peer
   */
  constructor(peer) {
    this.peer = peer
  }

  register() {
    this._subscribe(
      topics.topic(topics.prefix.NOTICE, 'db', 'post'),
      this._handleDatabasePost.bind(this)
    )
    this._subscribe(
      topics.topic(topics.prefix.NOTICE, 'db', 'delete'),
      this._handleDatabaseDelete.bind(this)
    )
    this._subscribe(
      topics.topic(topics.prefix.NOTICE, 'profile', 'request'),
      this._handleProfileRequest.bind(this)
    )
  }

  _subscribe(channel, handler) {
    this.peer.libp2p.pubsub.on(channel, async(message) => {
      const json = JSON.parse(uint8ArrayToString(message.data))
      const parsedMessage = Message.fromJson(json)
      noticesdebugger(`received message on topic ${channel}: %O`, parsedMessage)
      const result = await handler(parsedMessage)

      if (result === true) {
        noticesdebugger(`desseminating message on topic ${channel} after ${peerConfig.notices.FLOOD_DELAY}ms: %O`, parsedMessage)
        this._disseminateMessage(
          channel,
          message,
          peerConfig.notices.FLOOD_DELAY
        )
      }
    })
    this.peer.libp2p.pubsub.subscribe(channel)
  }

  /**
   * Resends the message to the topic after a given delay
   *
   * @param {string} channel the topic to send to
   * @param {*} message the received message
   * @param {number} delay the delay in milliseconds
   */
  async _disseminateMessage(channel, message, delay) {
    // sends the message after delay
    setTimeout(() => {
      this.peer.libp2p.pubsub.publish(channel, message.data)
    }, delay)
  }

  async publish(channel, body, sign = false) {
    const message = this.peer.messageBuilder.build(body, 'notice', sign)
    noticesdebugger(`publishing message on topic ${channel}: %O`, message)
    await this.peer.libp2p.pubsub.publish(
      channel,
      uint8ArrayFromString(JSON.stringify(message))
    )
  }

  async publishDatabasePost(username, publicKey, databaseId) {
    await this.publish(topics.topic(topics.prefix.NOTICE, 'db', 'post'), {
      username,
      publicKey,
      databaseId,
      peerId: this.peer.id().toB58String()
    })
  }

  async publishDatabaseDelete(username, databaseId) {
    await this.publish(
      topics.topic(topics.prefix.NOTICE, 'db', 'delete'),
      {
        username,
        databaseId
      },
      true
    )
  }

  /**
   * Publishes a profile request.
   *
   * @param {string[]} usernames the usernames
   * @param {number} timestamp the timestamp
   */
  async publishProfileRequest(usernames, timestamp = -1) {
    const filteredUsernames = usernames.filter(
      (current) => current !== this.peer.username
    )

    if (filteredUsernames.length === 0) {
      return
    }

    await this.publish(
      topics.topic(topics.prefix.NOTICE, 'profile', 'request'),
      {
        usernames: filteredUsernames,
        since: timestamp
      }
    )
  }

  /**
   * Handles the database post notice
   *
   * @param {Message} message the received message
   * @returns {boolean} true if the notice changed the database
   */
  async _handleDatabasePost(message) {
    const { username, publicKey, databaseId, peerId } = message.data

    if (databaseId > this.peer.authManager.getDatabaseId() + 1) {
      const database = await this.peer.authProtocol.neighborsDatabase()
      this.peer.authManager.setDatabase(database)
      return true
    }

    if (databaseId < this.peer.authManager.getDatabaseId()) {
      return false
    }

    this.peer.authManager.setEntry(username, publicKey, peerId)

    return true
  }

  /**
   * Handles the database delete notice
   *
   * @param {Message} message the received message
   * @returns {boolean} true if the notice changed the database
   */
  async _handleDatabaseDelete(message) {
    if (!this.peer.messageBuilder.isSigned(message)) {
      messagedebuger(`message with id ${message._metadata.id} from ${message._metadata.from} has no valid signature`)
      return false
    }

    const { username, databaseId } = message.data

    if (databaseId > this.peer.authManager.getDatabaseId() + 1) {
      const database = await this.peer.authProtocol.neighborsDatabase()
      this.peer.authManager.setDatabase(database)
      return true
    }

    if (databaseId < this.peer.authManager.getDatabaseId()) {
      return false
    }

    // removes data from database
    this.peer.authManager.delete(username)
    // remove data from cache and unsubscribes the user
    await this.peer.unsubscribe(username)
    this.peer.cache.deleteEntry(username)

    return true
  }

  /**
   * Handles the profile request notice
   *
   * @param {Message} message
   * @returns {boolean} true if the notice changed information
   */
  async _handleProfileRequest(message) {
    const { usernames, since } = message.data
    const { owner } = message._metadata

    if (usernames?.length === 0) {
      return false
    }

    try {
      const requester = this.peer.authManager.getIdByUsername(owner)

      // verify if i have the information about the peer

      const cache = this.peer.cache

      const map = cache.getAll(usernames, since)

      // if the usernames include the current peer, then send own posts
      if (usernames.includes(this.peer.username)) {
        map.set(this.peer.username, this.peer.postManager.getAll(since))
      }

      if ([].concat(...map.values()).length === 0) {
        return false
      }

      const data = Object.fromEntries(map)

      await this.peer.cacheProtocol.sendTo(requester, data)
    } catch (err) {
      noticesdebugger('error while handling profile request: %O', err)
      return false
    }

    return true
  }
}
