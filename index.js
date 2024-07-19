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

class Store {
  constructor () {
    this.db = new Map()
    this.pubsub = new PubSub()
  }

  /**
   * @returns {Store}
   */
  static build () {
    return new Store()
  }

  async has (k) {
    return await this.db.has(k)
  }

  async get (k) {
    return await this.db.get(k)
  }

  async set (k, v) {
    await this.db.set(k, v)
    await this.pubsub.pub(k, v, 'set')
  }

  async del (k) {
    if (!await this.has(k)) throw new StoreError('store.error.delete.key.not.exists', k)
    const v = await this.get(k)
    await this.db.delete(k)
    await this.pubsub.pub(k, v, 'del')
    await this.pubsub.unsub(k, v)
  }

  find (q, f = x => x) {
    if (typeof q === 'undefined') {
      q = () => true
    } else if (q instanceof RegExp) {
      const test = RegExp.prototype.test.bind(q)
      q = ([k]) => (test(k))
    }
    return function * gen () {
      for (const [k, v] of this.db.entries()) {
        const kv = [k, f(v)]
        if (q(kv)) yield kv
      }
    }.bind(this)()
  }

  async findOne (q) {
    const { value, done } = await this.find(q).next()
    if (!done) {
      const [, v] = value
      return v
    } else return undefined
  }

  async hasSub (src, k) {
    return await this.pubsub.has(src, k)
  }

  async pub (k) {
    const v = await this.get(k)
    await this.pubsub.pub(k, v, 'pub')
  }

  async sub (src, k, cb, now) {
    if (!await this.has(k)) throw new StoreError('store.error.sub.key.not.exists(k)', k)
    await this.pubsub.sub(src, k, cb)
    if (now) {
      const v = await this.get(k)
      await this.pubsub.pubTo(src, k, v, 'sub')
    }
  }

  async unsub (src, k) {
    if (!await this.has(k)) throw new StoreError('store.error.unsub.key.not.exists(k)', k)
    await this.pubsub.unsub(src, k)
  }

  async hasSubGlobal (src) {
    return await this.pubsub.hasGlobal(src)
  }

  async subGlobal (src, cb) {
    await this.pubsub.subGlobal(src, cb)
  }

  async unsubGlobal (src) {
    await this.pubsub.unsubGlobal(src)
  }

  async unsubEveryWhere (src) {
    await this.pubsub.unsubEveryWhere(src)
  }
}

class PubSub {
  constructor () {
    this.global = new Map()
    this.k_src_cb = new Map()
    this.src_ks = new Map()
  }

  async hasGlobal (src) {
    return await this.global.has(src)
  }

  async subGlobal (src, cb) {
    await this.global.set(src, cb)
  }

  async has (src, k) {
    return (await this.k_src_cb.has(k)) && (await this.src_ks.has(src)) && (await this.src_ks.get(src).has(k))
  }

  async sub (src, k, cb) {
    let srcCb = await this.k_src_cb.get(k)
    if (!srcCb) await this.k_src_cb.set(k, srcCb = new Map())
    await srcCb.set(src, cb)
    let ks = await this.src_ks.get(src)
    if (!ks) await this.src_ks.set(src, ks = new Set())
    ks.add(k)
  }

  async unsubGlobal (src) {
    this.global.delete(src)
  }

  async unsub (src, k) {
    const srcCb = await this.k_src_cb.get(k)
    if (srcCb) await srcCb.delete(src)
    const ks = await this.src_ks.get(src)
    if (ks) await ks.delete(k)
  }

  async unsubEveryWhere (src) {
    await this.unsubGlobal(src)
    const ks = await this.src_ks.get(src)
    if (ks) await Promise.all(Array.from(ks).map(async k => this.unsub(src, k)))
  }

  async pub (k, v, t) {
    await Promise.all(Array.from(this.global).map(async ([, cb]) => await cb(k, v, t)))
    const srcCb = await this.k_src_cb.get(k)
    if (srcCb) await Promise.all(Array.from(srcCb).map(async ([, cb]) => await cb(k, v, t)))
  }

  async pubTo (src, k, v, t) {
    const srcCb = await this.k_src_cb.get(k)
    const cb = await srcCb.get(src)
    await cb(k, v, t)
  }
}

class StoreError extends Error {
  constructor (message, ...param) {
    super(message)
    this.name = 'StoreError'
    this.message = message
    this.param = param
    this.stack = (new Error()).stack
  }
}

export { Store, PubSub, StoreError }
