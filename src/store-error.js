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
 * A custom Error for this module
 *
 * @class StoreError
 *
 * @param {string} message a base message
 * @param  {...any} params interesting parameters for error analysis
 */
export default class StoreError extends Error {
  constructor (message, ...params) {
    const f = (p) => (p && (typeof p === 'object') && p.toString().startsWith('[object')) ? JSON.stringify(p) : p
    super(message + (params.length > 0 ? '(' + params.map(f).join(', ') + ')' : ''))
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
    this.params = params
  }
}
