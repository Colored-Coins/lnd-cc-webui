const debug = require('debug')('LnCC')

exports.dbg = (label, o$) => {
  // label = `\x1b[95m${label}\x1b[0m`
  o$.subscribe(
    x => debug(`${label} ->`, x),
    err => debug(`${label} \x1b[91mError:\x1b[0m`, err.stack || err),
    () => debug(`${label} completed`)
  )
}

exports.min = (a, b) => a.lt(b) ? a : b
exports.max = (a, b) => a.gt(b) ? a : b

exports.currencyFormatter = currency => n => n.toString() + ' ' + currency
