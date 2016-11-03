import vagueTime from 'vague-time'

module.exports = function(date, type='past') {
  (date instanceof Date) || (date = new Date(date))

  let ts = +date

  switch (type) {
    case 'past':   ts = Math.min(ts, Date.now()); break
    case 'future': ts = Math.max(ts, Date.now()); break
    case 'any':    break
    default: throw new Error('unknown type')
  }

  return vagueTime.get({ to: ts })
}
