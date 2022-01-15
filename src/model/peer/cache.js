class Cache {
  constructor() {
    this.cache = new Map()
  }

  add(message) {
    const { owner } = message._metadata

    if (!this.cache.has(owner)) {
      this.cache.set(owner, [])
    }

    const cached = this.cache.get(owner)

    if (
      cached.find((curr) => curr._metadata.id === message._metadata.id) !==
      undefined
    ) {
      return false
    }

    cached.push(message)

    return true
  }

  get(owner, since) {
    const cached = this.cache.get(owner)

    if (since === undefined) {
      return cached
    }

    return cached.filter((message) => message._metadata.ownerTimestamp > since)
  }

  /**
   * Deletes the cache entries of a user.
   *
   * @param {string} owner the owner identifier
   * @returns {boolean} true if the user was deleted, false otherwise
   */
  deleteEntry(owner) {
    if (!this.cache.has(owner)) {
      return false
    }

    return this.cache.delete(owner)
  }

  has(owner) {
    return this.cache.has(owner)
  }
}

export default Cache
