import Message from './index.js'
import Post from './post.js'
import Cached from './cached.js'
import CacheRequest from './cacheRequest.js'

/**
 * Builds messages to send.
 */
export default class MessageBuilder {
  /**
   * Messages have the username of the sender in its metadata.
   * In order to build a message, the username of the sender is required.
   * In order to sign messages, the private key of the sender is required.
   * Since the private key can change in the course of the program, a reference to the peer is used.
   *
   * @param {Peer} peer the own peer
   */
  constructor(peer) {
    this.peer = peer
  }

  /**
   * Builds a new simple message, with the given data content.
   *
   * @param {object} data the data to send
   * @param {string} type the type of the message
   * @param {boolean} sign whether to sign the message
   * @returns the message object
   */
  build(data, type, sign) {
    const message = new Message(data, type, this.peer.username, Date.now())
    if (sign) { message.sign(this.peer.privateKey) }
    return message
  }

  /**
   * Messages that contribute to the timeline are special.
   * This builds them.
   * Posts have to be always signed, so they are signed here.
   *
   * @param {string} content the message to include in the post
   * @returns {Post} the Post message
   */
  buildPost(content) {
    const post = new Post(content, this.peer.username, Date.now())
    post.sign(this.peer.authManager.privateKey)
    return post
  }

  /**
   * Messages that contain information cached in a peer.
   *
   * @param {string} content the cached value
   * @returns the Cached message
   */
  buildCached(content) {
    return new Cached(content, this.peer.username, Date.now())
  }

  /**
   * Messages that will ask peers for cached data.
   *
   * @param {string} user the owner of the cached data
   * @param {Data} since the timestamp of the cached data
   * @returns the CacheRequest message
   */
  buildCacheRequest(user, since) {
    return new CacheRequest(user, since, this.peer.username, Date.now())
  }

  /**
   * Messages can come from a peer which is not its owner.
   * For example, for caching purposes, a peer can send a message to other peers,
   *   if those other peers end up sending that message to anyone else,
   *   both the owner (the original peer) and the sender (the peer who sent the message)
   *   are present in the metadata. The same for their timestamps.
   *
   * @param {Message} message the original message
   * @returns the new message
   */
  fromMessage(message) {
    message.updateTimestamp()
    message.updateUser(this.peer.username)
    return message
  }
}
