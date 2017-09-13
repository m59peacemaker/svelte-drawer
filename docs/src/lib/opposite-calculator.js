const OppositeCalculator = (...opposites) => {
  const map = opposites.reduce((map, [ a, b ]) => {
    map[a] = b
    map[b] = a
    return map
  }, {})
  return value => map[value]
}

export default OppositeCalculator
