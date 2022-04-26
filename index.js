const perf = typeof performance === 'object' && performance &&
  typeof performance.now === 'function' ? performance : Date

const isPosInt = n => n && n === Math.floor(n) && n > 0 && isFinite(n)

/* istanbul ignore next - This is a little bit ridiculous, tbh.
 * The maximum array length is 2^32-1 or thereabouts on most JS impls.
 * And well before that point, you're caching the entire world, I mean,
 * that's ~32GB of just integers for the next/prev links, plus whatever
 * else to hold that many keys and values.  Just filling the memory with
 * zeroes at init time is brutal when you get that big.
 * But why not be complete?
 * Maybe in the future, these limits will have expanded. */
const getUintArray = max => max <= Math.pow(2, 8) ? Uint8Array
: max <= Math.pow(2, 16) ? Uint16Array
: max <= Math.pow(2, 32) ? Uint32Array
: max <= Number.MAX_SAFE_INTEGER ? ZeroArray
: null

class ZeroArray extends Array {
  constructor (size) {
    super(size)
    this.fill(0)
  }
}

class Stack {
  constructor (max) {
    if (max === 0) {
      return []
    }
    const UintArray = getUintArray(max)
    this.heap = new UintArray(max)
    this.length = 0
  }
  push (n) {
    this.heap[this.length++] = n
  }
  pop () {
    return this.heap[--this.length]
  }
}

class LRUCache {
  constructor (options = {}) {
    const {
      max = 0,
      ttl,
      ttlResolution = 1,
      updateAgeOnGet,
      allowStale,
      maxAge,
      stale,
    } = options

    this.max = max

    const UintArray = max ? getUintArray(max) : Array

    if (process.env.NODE_ENV === 'development') {
      if (max !== 0 && !isPosInt(max)) {
        throw new TypeError('max option must be a nonnegative integer')
      }

      if (!UintArray) {
        throw new Error('invalid max value: ' + max)
      }
    }

    this.keyMap = new Map()
    this.keyList = new Array(max).fill(null)
    this.valList = new Array(max).fill(null)
    this.next = new UintArray(max)
    this.prev = new UintArray(max)
    this.head = 0
    this.tail = 0
    this.free = new Stack(max)
    this.initialFill = 1
    this.size = 0

    this.allowStale = !!allowStale || !!stale
    this.updateAgeOnGet = !!updateAgeOnGet
    this.ttlResolution = ttlResolution
    this.ttl = ttl || maxAge || 0
    if (this.ttl) {
      if (process.env.NODE_ENV === 'development') {
        if (!isPosInt(this.ttl)) {
          throw new TypeError('ttl must be a positive integer if specified')
        }
      }
      this.initializeTTLTracking()
    }
  }

  initializeTTLTracking () {
    this.ttls = new ZeroArray(this.max)
    this.starts = new ZeroArray(this.max)

    this.setItemTTL = (index, ttl) => {
      this.starts[index] = ttl !== 0 ? perf.now() : 0
      this.ttls[index] = ttl
    }

    this.updateItemAge = (index) => {
      this.starts[index] = this.ttls[index] !== 0 ? perf.now() : 0
    }

    // debounce calls to perf.now() to 1s so we're not hitting
    // that costly call repeatedly.
    let cachedNow = 0
    const getNow = () => {
      const n = perf.now()
      if (this.ttlResolution > 0) {
        cachedNow = n
        const t = setTimeout(() => cachedNow = 0, this.ttlResolution)
        /* istanbul ignore else - not available on all platforms */
        if (t.unref) {
          t.unref()
        }
      }
      return n
    }

    this.isStale = (index) => {
      return this.ttls[index] !== 0 && this.starts[index] !== 0 &&
        ((cachedNow || getNow()) - this.starts[index] > this.ttls[index])
    }
  }
  updateItemAge (index) {}
  setItemTTL (index, ttl) {}
  isStale (index) { return false }

  set (k, v, {
    ttl = this.ttl,
  } = {}) {
    let index = this.size === 0 ? undefined : this.keyMap.get(k)
    if (index === undefined) {
      // addition
      index = this.newIndex()
      this.keyList[index] = k
      this.valList[index] = v
      this.keyMap.set(k, index)
      this.next[this.tail] = index
      this.prev[index] = this.tail
      this.tail = index
      this.size ++
    } else {
      // update
      const oldVal = this.valList[index]
      if (v !== oldVal) {
        this.valList[index] = v
      }
      this.moveToTail(index)
    }
    if (ttl !== 0 && this.ttl === 0 && !this.ttls) {
      this.initializeTTLTracking()
    }

    this.setItemTTL(index, ttl)
    return this
  }

  newIndex () {
    if (this.size === 0) {
      return this.tail
    }
    if (this.size === this.max && this.max !== 0) {
      return this.evict(false)
    }
    if (this.free.length !== 0) {
      return this.free.pop()
    }
    // initial fill, just keep writing down the list
    return this.initialFill++
  }

  pop () {
    if (this.size) {
      const val = this.valList[this.head]
      this.evict(true)
      return val
    }
  }

  evict (free) {
    const head = this.head
    const k = this.keyList[head]
    // if we aren't about to use the index, then null these out
    if (free) {
      this.keyList[head] = null
      this.valList[head] = null
      this.free.push(head)
    }
    this.head = this.next[head]
    this.keyMap.delete(k)
    this.size --
    return head
  }

  has (k) {
    const index = this.keyMap.get(k)
    if (index !== undefined) {
      if (!this.isStale(index)) {
        return true
      }
    }
    return false
  }

  // like get(), but without any LRU updating or TTL expiration
  peek (k, { allowStale = this.allowStale } = {}) {
    const index = this.keyMap.get(k)
    if (index !== undefined && (allowStale || !this.isStale(index))) {
      return this.valList[index]
    }
  }

  get (k, {
    allowStale = this.allowStale,
    updateAgeOnGet = this.updateAgeOnGet,
  } = {}) {
    const index = this.keyMap.get(k)
    if (index !== undefined) {
      const value = this.valList[index]
      if (this.isStale(index)) {
        this.delete(k)
        return allowStale ? value : undefined
      } else {
        this.moveToTail(index)
        if (updateAgeOnGet) {
          this.updateItemAge(index)
        }
        return value
      }
    }
  }

  connect (p, n) {
    this.prev[n] = p
    this.next[p] = n
  }

  moveToTail (index) {
    // if tail already, nothing to do
    // if head, move head to next[index]
    // else
    //   move next[prev[index]] to next[index] (head has no prev)
    //   move prev[next[index]] to prev[index]
    // prev[index] = tail
    // next[tail] = index
    // tail = index
    if (index !== this.tail) {
      if (index === this.head) {
        this.head = this.next[index]
      } else {
        this.connect(this.prev[index], this.next[index])
      }
      this.connect(this.tail, index)
      this.tail = index
    }
  }

  delete (k) {
    let deleted = false
    if (this.size !== 0) {
      const index = this.keyMap.get(k)
      if (index !== undefined) {
        deleted = true
        if (this.size === 1) {
          this.clear()
        } else {
          this.keyMap.delete(k)
          this.keyList[index] = null
          this.valList[index] = null
          if (index === this.tail) {
            this.tail = this.prev[index]
          } else if (index === this.head) {
            this.head = this.next[index]
          } else {
            this.next[this.prev[index]] = this.next[index]
            this.prev[this.next[index]] = this.prev[index]
          }
          this.size --
          this.free.push(index)
        }
      }
    }
    return deleted
  }

  clear () {
    this.keyMap.clear()
    this.valList.fill(null)
    this.keyList.fill(null)
    if (this.ttls) {
      this.ttls.fill(0)
      this.starts.fill(0)
    }
    this.head = 0
    this.tail = 0
    this.initialFill = 1
    this.free.length = 0
    this.size = 0
  }
}

module.exports = LRUCache
