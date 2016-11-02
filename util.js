import { Observable as O } from 'rx'
import { randomBytes } from 'crypto'

const Debug = require('debug')
    , debug = Debug('LnCC')

export const makeSocketDriver = socket => out$ => (
  out$.subscribe(a => socket.emit(...a)),
  { events: O.fromEvent.bind(O, socket) })

export const makeWid = _ => randomBytes(32).toString('base64').replace(/\W+/g, '')

export const dbgStreams = streams =>  Object.keys(streams).forEach(k => dbgStream(k, streams[k]))

const dbgStream = (label, o$) => o$.subscribe(
  x => debug(`${label} ->`, x),
  err => debug(`${label} \x1b[91mError:\x1b[0m`, err.stack || err),
  () => debug(`${label} completed`)
)

export const errorFormatter = app => err =>
  (err.response && (nonEmptyObj(err.response.body) ? err.response.body : err.response.text)) ||
  (app.settings.env == 'development' && err.stack) ||
  err.message || err

const nonEmptyObj = obj => obj && Object.keys(obj).length

// expose debug object, call `Debug.enable()` to enable it
if (typeof window != 'undefined') window.Debug = Debug
