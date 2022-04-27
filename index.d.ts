// Type definitions for lru-cache 7.8
// Project: https://github.com/isaacs/node-lru-cache
// Definitions by: Bart van der Schoor <https://github.com/Bartvds>
//                 BendingBender <https://github.com/BendingBender>
//                 isaacs <https://github.com/isaacs>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference lib="DOM" />
// tslint:disable:member-access
declare class LRUCache<K, V> {
  constructor(options: LRUCache.Options<K, V>);

  // values populated from the constructor options
  public readonly max: number;
  public readonly ttl: number;
  public readonly ttlResolution: number;
  public readonly allowStale: boolean;

  /**
   * The total number of items held in the cache at the current moment.
   */
  public readonly size: number;

  /**
   * Add a value to the cache.
   */
  public set(key: K, value: V, options?: LRUCache.SetOptions<K, V>): this;

  /**
   * Return a value from the cache.
   * Will update the recency of the cache entry found.
   * If the key is not found, `get()` will return `undefined`.
   * This can be confusing when setting values specifically to `undefined`,
   * as in `cache.set(key, undefined)`. Use `cache.has()` to determine
   * whether a key is present in the cache at all.
   */
  // tslint:disable-next-line:no-unnecessary-generics
  public get<T = V>(key: K, options?: LRUCache.GetOptions): T | undefined;

  /**
   * Like `get()` but doesn't update recency or delete stale items.
   * Returns `undefined` if the item is stale, unless `allowStale` is set either on the cache or in the options object.
   */
  // tslint:disable-next-line:no-unnecessary-generics
  public peek<T = V>(key: K, options?: LRUCache.PeekOptions): T | undefined;

  /**
   * Check if a key is in the cache, without updating the recency or age.
   * Will return false if the item is stale, even though it is technically in the cache.
   */
  public has(key: K): boolean;

  /**
   * Deletes a key out of the cache.
   * Returns true if the key was deleted, false otherwise.
   */
  public delete(key: K): boolean;

  /**
   * Clear the cache entirely, throwing away all values.
   */
  public clear(): void;

  /**
   * Evict the least recently used item, returning its value or `undefined` if cache is empty.
   */
  public pop(): V | undefined;
}

declare namespace LRUCache {

  interface DeprecatedOptions<K, V> {
      /**
       * Maximum age in ms. Items are not pro-actively pruned out as they age,
       * but if you try to get an item that is too old, it'll drop it and return
       * undefined instead of giving it to you.
       *
       * @deprecated since 7.0 use options.ttl instead
       */
      maxAge?: number;

      /**
       * Function that is used to calculate the length of stored items.
       * If you're storing strings or buffers, then you probably want to do
       * something like `function(n, key){return n.length}`. The default
       * is `function(){return 1}`, which is fine if you want to store
       * `max` like-sized things. The item is passed as the first argument,
       * and the key is passed as the second argument.
       *
       * @deprecated since 7.0 use options.sizeCalculation instead
       */
      length?(value: V, key?: K): number;

      /**
       * By default, if you set a `maxAge`, it'll only actually pull stale items
       * out of the cache when you `get(key)`. (That is, it's not pre-emptively
       * doing a `setTimeout` or anything.) If you set `stale:true`, it'll return
       * the stale value before deleting it. If you don't set this, then it'll
       * return `undefined` when you try to get a stale entry,
       * as if it had already been deleted.
       *
       * @deprecated since 7.0 use options.allowStale instead
       */
      stale?: boolean;
  }

  interface LimitedByCount {
      /**
       * The number of most recently used items to keep.
       * Note that we may store fewer items than this if maxSize is hit.
       */
      max: number;
  }

  interface LimitedByTTL {
      /**
       * Max time to live for items before they are considered stale.
       * Note that stale items are NOT preemptively removed by default,
       * and MAY live in the cache, contributing to its LRU max, long after
       * they have expired.
       *
       * Also, as this cache is optimized for LRU/MRU operations, some of
       * the staleness/TTL checks will reduce performance, as they will incur
       * overhead by deleting items.
       *
       * Must be a positive integer in ms, defaults to 0, which means "no TTL"
       */
      ttl: number;

      /**
       * Minimum amount of time in ms in which to check for staleness.
       * Defaults to 1, which means that the current time is checked
       * at most once per millisecond.
       *
       * Set to 0 to check the current time every time staleness is tested.
       *
       * Note that setting this to a higher value will improve performance
       * somewhat while using ttl tracking, albeit at the expense of keeping
       * stale items around a bit longer than intended.
       *
       * @default 1
       * @since 7.1.0
       */
      ttlResolution?: number;

      /**
       * Return stale items from cache.get() before disposing of them
       *
       * @default false
       */
      allowStale?: boolean;

      /**
       * Update the age of items on cache.get(), renewing their TTL
       *
       * @default false
       */
      updateAgeOnGet?: boolean;
  }
  type SafetyBounds<K, V> = LimitedByCount | LimitedByTTL;

  type Options<K, V> = DeprecatedOptions<K, V> & SafetyBounds<K, V>;

  interface SetOptions<K, V> {
      ttl?: number;
  }

  interface GetOptions {
      allowStale?: boolean;
      updateAgeOnGet?: boolean;
  }

  interface PeekOptions {
      allowStale?: boolean;
  }
}

export = LRUCache;