# lru-cache

A cache object that deletes the least-recently-used items.

Specify a max number of the most recently used items that you want to keep,
and this cache will keep that many of the most recently accessed items.

This is not primarily a TTL cache, and does not make strong TTL guarantees.
There is no preemptive pruning of expired items by default, but you _may_
set a TTL on the cache or on a single `set`.  If you do so, it will treat
expired items as missing, and delete them when given.  If you are more
interested in TTL caching than LRU caching, check out
[@isaacs/ttlcache](http://npm.im/@isaacs/ttlcache).

As of version 7, this is one of the most performant LRU implementations
available in JavaScript, and supports a wide diversity of use cases.
However, note that using some of the features will necessarily impact
performance, by causing the cache to have to do more work.  See the
"Performance" section below.

## Installation

```bash
npm install lru-cache --save
```

## Usage

```js
const LRU = require('lru-cache')

// At least one of 'max' or 'ttl' is required, to prevent
// unsafe unbounded storage.
// In most cases, it's best to specify a max for performance, so all
// the required memory allocation is done up-front.
const options = {
  // the number of most recently used items to keep.
  max: 500, // <-- Technically optional, but see "Storage Bounds Safety" below

  // max time to live for items before they are considered stale
  // note that stale items are NOT preemptively removed by default,
  // and MAY live in the cache, contributing to its LRU max, long after
  // they have expired.
  // Also, as this cache is optimized for LRU/MRU operations, some of
  // the staleness/TTL checks will reduce performance, as they will incur
  // overhead by deleting items.
  // Must be a positive integer in ms, defaults to 0, which means "no TTL"
  ttl: 1000 * 60 * 5,

  // return stale items from cache.get() before disposing of them
  // boolean, default false
  allowStale: false,

  // update the age of items on cache.get(), renewing their TTL
  // boolean, default false
  updateAgeOnGet: false,
}

const cache = new LRU(options)

cache.set("key", "value")
cache.get("key") // "value"

// non-string keys ARE fully supported
// but note that it must be THE SAME object, not
// just a JSON-equivalent object.
var someObject = { a: 1 }
cache.set(someObject, 'a value')
// Object keys are not toString()-ed
cache.set('[object Object]', 'a different value')
assert.equal(cache.get(someObject), 'a value')
// A similar object with same keys/values won't work,
// because it's a different object identity
assert.equal(cache.get({ a: 1 }), undefined)

cache.clear()    // empty the cache
```

If you put more stuff in it, then items will fall out.

## Options

* `max` - The maximum number (or size) of items that remain in the cache
  (assuming no TTL pruning or explicit deletions).  Note that fewer items
  may be stored if size calculation is used.
  This must be a positive finite intger.

    At least one of `max` or `ttl` is required.  This must be a
    positive integer if set.

    **It is strongly recommended to set a `max` to prevent unbounded growth
    of the cache.**  See "Storage Bounds Safety" below.

* `ttl` - max time to live for items before they are considered stale.
  Note that stale items are NOT preemptively removed by default, and MAY
  live in the cache, contributing to its LRU max, long after they have
  expired.

    Also, as this cache is optimized for LRU/MRU operations, some of
    the staleness/TTL checks will reduce performance, as they will incur
    overhead by deleting from Map objects rather than simply throwing old
    Map objects away.

    This is not primarily a TTL cache, and does not make strong TTL
    guarantees.  There is no pre-emptive pruning of expired items, but you
    _may_ set a TTL on the cache, and it will treat expired items as missing
    when they are given, and delete them.

    Optional, but must be a positive integer in ms if specified.

    This may be overridden by passing an options object to `cache.set()`.

    At least one of `max` or `ttl` is required.  This must be a
    positive integer if set.

    Even if ttl tracking is enabled, **it is strongly recommended to set a
    `max` to prevent unbounded growth of the cache.**  See "Storage Bounds
    Safety" below.

    If ttl tracking is enabled, and `max` are not set, then a warning will
    be emitted cautioning about the potential for unbounded memory consumption.

    Deprecated alias: `maxAge`

* `ttlResolution` - Minimum amount of time in ms in which to check for
  staleness.  Defaults to `1`, which means that the current time is checked
  at most once per millisecond.

    Set to `0` to check the current time every time staleness is tested.

    Note that setting this to a higher value _will_ improve performance
    somewhat while using ttl tracking, albeit at the expense of keeping
    stale items around a bit longer than intended.

* `allowStale` - By default, if you set `ttl`, it'll only delete stale
  items from the cache when you `get(key)`.  That is, it's not
  preemptively pruning items.

    If you set `allowStale:true`, it'll return the stale value as well as
    deleting it.  If you don't set this, then it'll return `undefined` when
    you try to get a stale entry.

    Note that when a stale entry is given, _even if it is returned due to
    `allowStale` being set_, it is removed from the cache immediately.  You
    can immediately put it back in the cache if you wish, thus resetting the
    TTL.

    This may be overridden by passing an options object to `cache.get()`.
    The `cache.has()` method will always return `false` for stale items.

    Boolean, default false, only relevant if `ttl` is set.

    Deprecated alias: `stale`

* `updateAgeOnGet` - When using time-expiring entries with `ttl`, setting
  this to `true` will make each item's age reset to 0 whenever it is
  retrieved from cache with `get()`, causing it to not expire.  (It can
  still fall out of cache based on recency of use, of course.)

    This may be overridden by passing an options object to `cache.get()`.

    Boolean, default false, only relevant if `ttl` is set.

## API

* `new LRUCache(options)`

    Create a new LRUCache.  All options are documented above, and are on
    the cache as public members.

* `cache.max`, `cache.allowStale`, `cache.ttl`, `cache.updateAgeOnGet`

    All option names are exposed as public members on the cache object.

    These are intended for read access only.  Changing them during program
    operation can cause undefined behavior.

* `cache.size`

    The total number of items held in the cache at the current moment.

* `cache.calculatedSize`

    The total size of items in cache when using size tracking.

* `set(key, value, [{ size, ttl }])`

    Add a value to the cache.

    Optional options object may contain `ttl` as
    described above, which default to the settings on the cache object.

    Options object my also include `size`, which will just use the specified number if it is a
    positive integer.

    Will update the recency of the entry.

    Returns the cache object.

* `get(key, { updateAgeOnGet, allowStale } = {}) => value`

    Return a value from the cache.

    Will update the recency of the cache entry found.

    If the key is not found, `get()` will return `undefined`.  This can be
    confusing when setting values specifically to `undefined`, as in
    `cache.set(key, undefined)`.  Use `cache.has()` to determine whether a
    key is present in the cache at all.

* `peek(key, { allowStale } = {}) => value`

    Like `get()` but doesn't update recency or delete stale items.

    Returns `undefined` if the item is stale, unless `allowStale` is set
    either on the cache or in the options object.

* `has(key) => Boolean`

    Check if a key is in the cache, without updating the recency of use.
    Age is not updated.

    Will return `false` if the item is stale, even though it is technically
    in the cache.

* `delete(key)`

    Deletes a key out of the cache.

    Returns `true` if the key was deleted, `false` otherwise.

* `clear()`

    Clear the cache entirely, throwing away all values.

* `pop()`

    Evict the least recently used item, returning its value.

    Returns `undefined` if cache is empty.

### Internal Methods and Properties

In order to optimize performance as much as possible, "private" members and
methods are exposed on the object as normal properties, rather than being
accessed via Symbols, private members, or closure variables.

**Do not use or rely on these.**  They will change or be removed without
notice.  They will cause undefined behavior if used inappropriately.  There
is no need or reason to ever call them directly.

This documentation is here so that it is especially clear that this not
"undocumented" because someone forgot; it _is_ documented, and the
documentation is telling you not to do it.

**Do not report bugs that stem from using these properties.**  They will be
ignored.

* `initializeTTLTracking()` Set up the cache for tracking TTLs
* `updateItemAge(index)` Called when an item age is updated, by internal ID
* `setItemTTL(index)` Called when an item ttl is updated, by internal ID
* `isStale(index)` Called to check an item's staleness, by internal ID
* `newIndex()` Create a new internal ID, either reusing a deleted ID,
  evicting the least recently used ID, or walking to the end of the
  allotted space.
* `evict()` Evict the least recently used internal ID, returning its ID.
  Does not do any bounds checking.
* `connect(p, n)` Connect the `p` and `n` internal IDs in the linked list.
* `moveToTail(index)` Move the specified internal ID to the most recently
  used position.
* `keyMap` Map of keys to internal IDs
* `keyList` List of keys by internal ID
* `valList` List of values by internal ID
* `ttls` List of TTL values by internal ID
* `starts` List of start time values by internal ID
* `next` Array of "next" pointers by internal ID
* `prev` Array of "previous" pointers by internal ID
* `head` Internal ID of least recently used item
* `tail` Internal ID of most recently used item
* `free` Stack of deleted internal IDs

## Storage Bounds Safety

This implementation aims to be as flexible as possible, within the limits
of safe memory consumption and optimal performance.

At initial object creation, storage is allocated for `max` items.  If `max`
is set to zero, then some performance is lost, and item count is unbounded.
`ttl` _must_ be set if `max` is not specified.

If `max` not set, then `ttl` tracking must be
enabled.  Note that, even when tracking item `ttl`, items are _not_
preemptively deleted when they become stale.
Instead, they are only purged the next time the key is requested.
Thus, if `max` is not set, then the cache will potentially grow unbounded.

In this case, a warning is printed to standard error.

If you truly wish to use a cache that is bound _only_ by TTL expiration,
consider using a `Map` object, and calling `setTimeout` to delete entries
when they expire.  It will perform much better than an LRU cache.

Here is an implementation you may use, under the same [license](./LICENSE)
as this package:

```js
// a storage-unbounded ttl cache that is not an lru-cache
const cache = {
  data: new Map(),
  timers: new Map(),
  set: (k, v, ttl) => {
    if (cache.timers.has(k)) {
      clearTimeout(cache.timers.get(k))
    }
    cache.timers.set(k, setTimeout(() => cache.del(k), ttl))
    cache.data.set(k, v)
  },
  get: k => cache.data.get(k),
  has: k => cache.data.has(k),
  delete: k => {
    if (cache.timers.has(k)) {
      clearTimeout(cache.timers.get(k))
    }
    cache.timers.delete(k)
    return cache.data.delete(k)
  },
  clear: () => {
    cache.data.clear()
    for (const v of cache.timers.values()) {
      clearTimeout(v)
    }
    cache.timers.clear()
  }
}
```

## Performance

As of January 2022, version 7 of this library is one of the most performant
LRU cache implementations in JavaScript.

Benchmarks can be extremely difficult to get right.  In particular, the
performance of set/get/delete operations on objects will vary _wildly_
depending on the type of key used.  V8 is highly optimized for objects with
keys that are short strings, especially integer numeric strings.  Thus any
benchmark which tests _solely_ using numbers as keys will tend to find that
an object-based approach performs the best.

Note that coercing _anything_ to strings to use as object keys is unsafe,
unless you can be 100% certain that no other type of value will be used.
For example:

```js
const myCache = {}
const set = (k, v) => myCache[k] = v
const get = (k) => myCache[k]

set({}, 'please hang onto this for me')
set('[object Object]', 'oopsie')
```

Also beware of "Just So" stories regarding performance.  Garbage collection
of large (especially: deep) object graphs can be incredibly costly, with
several "tipping points" where it increases exponentially.  As a result,
putting that off until later can make it much worse, and less predictable.
If a library performs well, but only in a scenario where the object graph is
kept shallow, then that won't help you if you are using large objects as
keys.

In general, when attempting to use a library to improve performance (such
as a cache like this one), it's best to choose an option that will perform
well in the sorts of scenarios where you'll actually use it.

This library is optimized for repeated gets and minimizing eviction time,
since that is the expected need of a LRU.  Set operations are somewhat
slower on average than a few other options, in part because of that
optimization.  It is assumed that you'll be caching some costly operation,
ideally as rarely as possible, so optimizing set over get would be unwise.

If performance matters to you:

1. If it's at all possible to use small integer values as keys, and you can
   guarantee that no other types of values will be used as keys, then do
   that, and use a cache such as
   [lru-fast](https://npmjs.com/package/lru-fast), or [mnemonist's
   LRUCache](https://yomguithereal.github.io/mnemonist/lru-cache) which
   uses an Object as its data store.
2. Failing that, if at all possible, use short non-numeric strings (ie,
   less than 256 characters) as your keys, and use [mnemonist's
   LRUCache](https://yomguithereal.github.io/mnemonist/lru-cache).
3. If the types of your keys will be long strings, strings that look like
   floats, `null`, objects, or some mix of types, or if you aren't sure,
   then this library will work well for you.

## Breaking Changes in Version 7

This library changed to a different algorithm and internal data structure
in version 7, yielding significantly better performance, albeit with
some subtle changes as a result.

If you were relying on the internals of LRUCache in version 6 or before, it
probably will not work in version 7 and above.

For more info, see the [change log](CHANGELOG.md).
