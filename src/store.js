/*
 * Copyright 2017 Nicolas Lochet Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is
 * distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 */

import PubSub, { PubSubType } from './pubsub.js'
import StoreError from './store-error.js'

/**
 * An in-memory key-value Store with Pub/Sub mechanism
 *
 * @class Store
 */
export default class Store {
  constructor () {
    this.db = new Map()
    this.pubsub = new PubSub()
  }

  /**
   * A static Store builder
   *
   * @returns {Store} a new Store
   */
  static build () {
    return new Store()
  }

  /**
   * Checks presence of one entry in the key-value store
   *
   * @param {string} k The key of the entry
   * @returns {Promise<boolean>} Resolves with the presence when the operation is complete
   */
  async has (k) {
    return await this.db.has(k)
  }

  /**
   * Gets one entry in the key-value store
   *
   * @param {string} k The key of the entry
   * @returns {Promise<any>} Resolves with the value when the operation is complete
   */
  async get (k) {
    return await this.db.get(k)
  }

  /**
   * Sets one entry in the key-value store.
   *
   * Also publish with {@link PubSubType.set} type to subscribers.
   *
   * @param {string} k The key of the entry
   * @param {any} v The value of the entry
   * @returns {Promise<void>} Resolves when the operation is complete
   */
  async set (k, v) {
    await this.db.set(k, v)
    await this.pubsub.pub(k, v, PubSubType.set)
  }

  /**
   * Deletes one entry in the key-value store.
   *
   * Also unsubscribe any subscriber and publish the entry with {@link  PubSubType.del} type.
   *
   * @param {string} k The key of the entry
   * @returns {Promise<void>} Resolves when the operation is complete
   */
  async del (k) {
    if (!(await this.has(k))) throw new StoreError('store.error.delete.key.not.exists', k)
    const v = await this.get(k)
    await this.db.delete(k)
    await this.pubsub.pub(k, v, PubSubType.del)
    await this.pubsub.unsub(k, v)
  }

  /**
   * Find entries in the key-value store matching a query.
   *
   * Returns an async iterable of [key, value] pairs, where each value is mapped by the provided function
   * and filtered by the query predicate or regular expression.
   *
   * @param {(function([string, *]): boolean|RegExp)} [q] - A predicate function that receives a [key, value] pair and returns true to include it, or a RegExp to match keys. If omitted, all entries are included.
   * @param {function(*): *} [f] - A mapping function applied to each value before filtering. Defaults to the identity function.
   * @returns {AsyncIterable.<[string, *]>} Async iterable of filtered [key, mappedValue] pairs.
   *
   * @example
   * // Find all keys matching /^foo/ and uppercase the values
   * for await (const [k, v] of store.find(/^foo/, v => v.toUpperCase())) {
   *   console.log(k, v);
   * }
   */
  find (q = undefined, f = x => x) {
    if (typeof q === 'undefined') {
      q = () => true
    } else if (q instanceof RegExp) {
      const test = RegExp.prototype.test.bind(q)
      q = ([k]) => test(k)
    }

    const entries = this.db.entries()

    return {
      [Symbol.asyncIterator] () { return this },
      next () {
        let result
        while (!(result = entries.next()).done) {
          const [k, v] = result.value
          const kv = [k, f(v)]
          if (q(kv)) {
            return { value: kv, done: false }
          }
        }
        return { value: undefined, done: true }
      }
    }
  }

  /**
   * Finds the first entry in key-value store matching a query and returns its value
   *
   * @param {(function([string, *]): boolean|RegExp)} [q] - A predicate function that receives a [key, value] pair and returns true to include it, or a RegExp to match keys. If omitted, all entries are included.
   * @returns {Promise<any|undefined>} The value if found, undefined otherwise
   */
  async findOne (q = undefined) {
    const { value, done } = await this.find(q).next()
    if (!done) {
      const [, v] = value
      return v
    } else return undefined
  }

  /**
   * Checks if a subscription exists on a key for a source
   *
   * @param {string} src The source of the subscription
   * @param {string} k The key of the subscribed value
   * @returns {Promise<boolean>} Resolves with the presence of a subscription when the operation is complete
   */
  async hasSub (src, k) {
    return await this.pubsub.has(src, k)
  }

  /**
   * Triggers a Publish on the entry for a given key with {@link PubSubType.pub} type.
   *
   * @param {string} k The key of the entry
   * @returns {Promise<void>} Resolves when the operation is complete
   */
  async pub (k) {
    const v = await this.get(k)
    await this.pubsub.pub(k, v, PubSubType.pub)
  }

  /**
   * Subscribes to an entry on a key for a source with a callback on changes.
   *
   * @param {string} src The source of the subscription
   * @param {string} k The key of the subscribed value
   * @param {function(k: string, v: any, t: PubSubType):void} cb The callback triggered when a publish is triggered on a subscribed entry
   *  - `k` The key of the subscribed value
   *  - `v` The subscribed value
   *  - `t` The type of trigger
   * @param {boolean} now Triggers a publish with {@link PubSubType.sub} type
   * @returns {Promise<void>} Resolves when the operation is complete
   */
  async sub (src, k, cb, now) {
    if (!await this.has(k)) throw new StoreError('store.error.sub.key.not.exists(k)', k)
    await this.pubsub.sub(src, k, cb)
    if (now) {
      const v = await this.get(k)
      await this.pubsub.pubTo(src, k, v, PubSubType.sub)
    }
  }

  /**
   * Unsubscribes to an entry on a key for a source
   *
   * @param {string} src The source of the subscription
   * @param {string} k The key of the subscribed value
   * @returns {Promise<void>} Resolves when the operation is complete
   */
  async unsub (src, k) {
    if (!await this.has(k)) throw new StoreError('store.error.unsub.key.not.exists(k)', k)
    await this.pubsub.unsub(src, k)
  }

  /**
   * Checks if a global subscription exists for a source
   *
   * @param {string} src The source of the subscription
   * @returns {Promise<boolean>} Resolves with the presence of a subscription when the operation is complete
   */
  async hasSubGlobal (src) {
    return await this.pubsub.hasGlobal(src)
  }

  /**
   * Subscribes globally for a source with a callback on changes
   *
   * @param {string} src The source of the subscription
   * @param {function(k: string, v: any, t: PubSubType):void} cb The callback triggered when a publish is triggered on the store
   *  - `k` The key of the subscribed value
   *  - `v` The subscribed value
   *  - `t` The type of trigger
   * @returns {Promise<void>} Resolves when the operation is complete
   */
  async subGlobal (src, cb) {
    await this.pubsub.subGlobal(src, cb)
  }

  /**
   * Unsubscribes globally for a source
   *
   * @param {string} src The source of the subscription
   * @returns {Promise<void>} Resolves when the operation is complete
   */
  async unsubGlobal (src) {
    await this.pubsub.unsubGlobal(src)
  }

  /**
   * Unsubscribes everywhere for a source
   *
   * @param {string} src The source of the subscription
   * @returns {Promise<void>} Resolves when the operation is complete
   */
  async unsubEveryWhere (src) {
    await this.pubsub.unsubEveryWhere(src)
  }
}
