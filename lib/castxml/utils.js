export default {
  assignFields: (target, source) => Object.keys(source).filter(key => key in target).forEach(key => target[key] = source[key]),
}