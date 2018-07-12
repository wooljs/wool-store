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
  constructor() {
    this.db = new Map()
    this.obs = new Map()
  }
  static build() {
    return new Store()
  }
  static newId() {
    return Date.now().toString(16) // TODO: improve this algo
  }
  has(k) {
    return this.db.has(k)
  }
  get(k) {
    let o = this.db.get(k)
    return o ? o.get() : undefined
  }
  set(k, v) {
    let o = this.db.get(k)
    if (o) {
      o.set(v)
    } else {
      this.db.set(k, new Observable(k, v))
    }
    this.pubAll(k, v, 'update')
  }
  del(k) {
    if (! this.has(k)) {
      throw new Error('Cannot delete, "'+k+'" does not exists !')
    }
    let o = this.db.get(k)
    this.pubAll(k, o.get(), 'delete')
    o.pub('delete')
    this.db.delete(k)
  }
  find(q) {
    if (typeof q === 'undefined') {
      q = () => true
    } else if (q instanceof RegExp) {
      let test = RegExp.prototype.test.bind(q)
      q = ([k]) => (test(k))
    }
    return function* gen() {
      for (let [k, o] of this.db.entries()) {
        let v = o.get()
          , kv = [k,v]
        if ( q(kv) ) yield kv
      }
    }.bind(this)()
  }
  sub(k, src, cb, now) {
    if (! this.has(k)) {
      throw new Error('Cannot subscribe, "'+k+'" does not exists !')
    }
    let o = this.db.get(k)
    o.sub(src, cb)
    if (now) o.pub('sub')
  }
  unsub(k, src) {
    if (! this.has(k)) {
      throw new Error('Cannot unsubscribe, "'+k+'" does not exists !')
    }
    let o = this.db.get(k)
    o.unsub(src)
  }
  subAll(src, cb){
    this.obs.set(src,cb)
  }
  unsubAll(src) {
    this.obs.delete(src)
  }
  pubAll(k, v, t) {
    this.obs.forEach(cb => cb(k, v, t))
  }
  unsubEveryWhere(src) {
    this.unsubAll(src)
    // TODO optimize datamodel for this case
    for (let [, o] of this.db.entries()) {
      o.unsub(src)
    }
  }
}

class Observable {
  constructor(k, v) {
    this.k = k
    this.v = v
    this.obs = new Map()
  }
  set(v) {
    this.v = v
    this.pub('update')
  }
  get() {
    return this.v
  }
  sub(src, cb) {
//    console.log('sub ', this.k, src)
    this.obs.set(src,cb)
  }
  unsub(src) {
//    console.log('unsub ', this.k, src)
    this.obs.delete(src)
  }
  pub(t) {
    this.obs.forEach(cb => cb(this.k, this.v, t))
  }
}

class AsyncStore extends Store {
  async has(k) {
    return await super.has(k)
  }
  async get(k) {
    return await super.get(k)
  }
  async set(k, v) {
    return await super.set(k, v)
  }
  async del(k) {
    return await super.del(k)
  }
}

module.exports = { Store, AsyncStore, Observable}
