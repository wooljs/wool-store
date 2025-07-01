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

/**
 * An Enum of string, with following valid values :
 *  - `sub`: triggered on subscription (with `now` param to `true`)
 *  - `pub`: triggered on force publish
 *  - `set`: triggered on setting a new value
 *  - `del`: triggered on deleting the key
 * @enum {string}
 *
 * @example
 * if (t === PubSubType.sub) {
 *   ...
 * }
 */
export const PubSubType = {
  sub: 'sub',
  pub: 'pub',
  set: 'set',
  del: 'del'
}

/**
 * A Pub/Sub utility for Store
 *
 * @class PubSub
 */
export default class PubSub {
  /**
   * Create a PubSub
   */
  constructor () {
    this.global = new Map()
    this.k_src_cb = new Map()
    this.src_ks = new Map()
  }

  /**
   * Checks if a global subscription exists for a source
   *
   * @param {string} src The source of the subscription
   * @returns {Promise<boolean>} Resolves with the presence of a subscription when the operation is complete
   */
  async hasGlobal (src) {
    return await this.global.has(src)
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
    await this.global.set(src, cb)
  }

  /**
   * Checks if a subscription exists on a key for a source
   *
   * @param {string} src The source of the subscription
   * @param {string} k The key of the subscribed value
   * @returns {Promise<boolean>} Resolves with the presence of a subscription when the operation is complete
   */
  async has (src, k) {
    return (await this.k_src_cb.has(k)) && (await this.src_ks.has(src)) && (await this.src_ks.get(src).has(k))
  }

  /**
   * Subscribes to an entry on a key for a source with a callback on changes
   *
   * @param {string} src The source of the subscription
   * @param {string} k The key of the subscribed value
   * @param {function(k: string, v: any, t: PubSubType):void} cb The callback triggered when a publish is triggered on a subscribed entry
   *  - `k` The key of the subscribed value
   *  - `v` The subscribed value
   *  - `t` The type of trigger
   * @returns {Promise<void>} Resolves when the operation is complete
   */
  async sub (src, k, cb) {
    let srcCb = await this.k_src_cb.get(k)
    if (!srcCb) await this.k_src_cb.set(k, srcCb = new Map())
    await srcCb.set(src, cb)
    let ks = await this.src_ks.get(src)
    if (!ks) await this.src_ks.set(src, ks = new Set())
    ks.add(k)
  }

  /**
   * Unsubscribes globally for a source
   *
   * @param {string} src The source of the subscription
   * @returns {Promise<void>} Resolves when the operation is complete
   */
  async unsubGlobal (src) {
    this.global.delete(src)
  }

  /**
   * Unsubscribes to an entry on a key for a source
   *
   * @param {string} src The source of the subscription
   * @param {string} k The key of the subscribed value
   * @returns {Promise<void>} Resolves when the operation is complete
   */
  async unsub (src, k) {
    const srcCb = await this.k_src_cb.get(k)
    if (srcCb) await srcCb.delete(src)
    const ks = await this.src_ks.get(src)
    if (ks) await ks.delete(k)
  }

  /**
   * Unsubscribes everywhere for a source
   *
   * @param {string} src The source of the subscription
   * @returns {Promise<void>} Resolves when the operation is complete
   */
  async unsubEveryWhere (src) {
    await this.unsubGlobal(src)
    const ks = await this.src_ks.get(src)
    if (ks) await Promise.all(Array.from(ks).map(async k => this.unsub(src, k)))
  }

  /**
   * Triggers a Publish on the entry for a given key
   *
   * @param {string} k The key of the entry
   * @param {*} v The value of the entry
   * @param {PubSubType} t The type of publish to send to callback
   * @returns {Promise<void>} Resolves when the operation is complete
   */
  async pub (k, v, t) {
    await Promise.all(Array.from(this.global).map(async ([, cb]) => await cb(k, v, t)))
    const srcCb = await this.k_src_cb.get(k)
    if (srcCb) await Promise.all(Array.from(srcCb).map(async ([, cb]) => await cb(k, v, t)))
  }

  /**
   * Triggers a Publish on the entry for a given key for a source
   *
   * @param {string} src The source of the subscription
   * @param {string} k The key of the entry
   * @param {*} v The value of the entry
   * @param {PubSubType} t The type of publish to send to callback
   * @returns {Promise<void>} Resolves when the operation is complete
   */
  async pubTo (src, k, v, t) {
    const srcCb = await this.k_src_cb.get(k)
    const cb = await srcCb.get(src)
    await cb(k, v, t)
  }
}
