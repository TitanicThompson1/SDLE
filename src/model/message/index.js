import { v4 as uuidv4 } from 'uuid'

// wrapper for exchanged messages between peers
// in the future can hold things like IDs or timestamps
export default class Message {
  /**
   *
   * @param {Object} data the qualitative content of the message
   * @param {string} owner the username of the peer that originally created the message
   * @param {int} ownerTimestamp the timestamp in which the message was originally created
   * @param {string} from the username of the peer that sent the message
   * @param {int} sentTimestamp the timestamp in which the message was lastly sent
   * @param {string} originalId the uuid of the message
   */
  constructor(data, owner, ownerTimestamp, from, sentTimestamp, originalId) {
    this.data = data
    this._metadata = {
      id: originalId || uuidv4(),
      owner,
      from: from || owner,
      ownerTimestamp,
      sentTimestamp: sentTimestamp || ownerTimestamp
    }
  }

  /**
   * Converts a json object into a Message object.
   *
   * @param {object} json the json object to convert to a message
   * @returns the message object
   */
  static fromJson(json) {
    return new Message(
      json.data,
      json._metadata.owner,
      json._metadata.ownerTimestamp,
      json._metadata.from,
      json._metadata.timestamp,
      json._metadata.id
    )
  }
}
