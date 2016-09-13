const debug = require('debug')('LnCC')

const dbgStream = (label, o$) => o$.subscribe(
  x => debug(`${label} ->`, x),
  err => debug(`${label} \x1b[91mError:\x1b[0m`, err.stack || err),
  () => debug(`${label} completed`)
)

export default function dbgStreams(streams) {
  Object.keys(streams).forEach(k => dbgStream(k, streams[k]))
}


// expose debug object, call `mdebug.enable()` to enable it
if (typeof window != 'undefined') window.mdebug = debug
