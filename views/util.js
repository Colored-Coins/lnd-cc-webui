const RE_FORMAT = /\B(?=(\d{3})+(?!\d))/g

export const formatNumber = (s, p=(''+s).split('.')) =>
  [ p[0].replace(RE_FORMAT, ','), ...p.slice(1) ].join('.')

