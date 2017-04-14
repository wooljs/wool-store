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

module.exports = (function () {
  'use strict'

  function Store() {
    if (! (this instanceof Store)) return new Store()
    this._ = {}
  }
  Store.prototype.set = function(id, value) {
    if (! this.has(id)) {
      this._[id] = {s: {}}
    }
    this._[id].v = value
    this.pub(id, 'update')
  }
  Store.prototype.pub = function(id, t) {
    Object.keys(this._[id].s).forEach(function(k) { this._[id].s[k](id, this._[id].v, t) }.bind(this))
  }
  Store.prototype.has = function(id) {
    return id in this._
  }
  Store.prototype.get = function(id) {
    return this._[id].v
  }
  Store.prototype.del = function(id) {
    if (! this.has(id)) {
      throw new Error('Cannot delete, "'+id+'" does not exists !')
    }
    this.pub(id, 'delete')
    delete this._[id]
  }
  Store.prototype.sub = function(id, src, cb, now) {
    if (! this.has(id)) {
      throw new Error('Cannot subscribe to "'+id+'" does not exists !')
    }
    this._[id].s[src] = cb
    if (now) cb(id, this._[id].v, 'sub')
  }
  Store.prototype.unsub = function(id, src) {
    delete this._[id].s[src]
  }
  Store.prototype.newId = Store.newId = function() {
    return Date.now().toString(16) // TODO: improve this algo
  }

  return Store
}())