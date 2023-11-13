import {promisify} from 'util'

export const timeout = promisify(setTimeout)
export const debounce = (timeout) => {
  let timer
  return (callback) => {
    clearTimeout(timer)
    timer = setTimeout(callback, timeout)
  }
}
export const random = (array) => array[Math.floor(Math.random() * array.length)]
export const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const item = array[i]
    array[i] = array[j]
    array[j] = item
  }
  return array
}
export const timezone = () => 8 * 60 * 60 * 1000
export const dateNow = () => new Date(Date.now() + timezone())
export const dateDay = (date) => [date.getUTCMonth(), date.getUTCDate()]
export const dateString = (date) =>
  [
    `${date.getUTCFullYear()}年`,
    `${date.getUTCMonth() + 1}月`,
    `${date.getUTCDate()}日`,
    `星期${[...'日一二三四五六'][date.getUTCDay()]}`,
  ].join('')
export const dayString = (day) =>
  [day[0].toString().slice(-2).padStart(2, '0'), day[1].toString().slice(-2).padStart(2, '0')].join('')
export const dateOffset = (date, offset) => {
  date = new Date(date.getTime())
  date.setUTCDate(date.getUTCDate() + offset)
  return date
}
export const dateOrigin = (date) => {
  date = new Date(date.getTime())
  date.setUTCHours(0)
  date.setUTCMinutes(0)
  date.setUTCSeconds(0)
  date.setUTCMilliseconds(0)
  return date
}
export const displayName = ({username, first_name, last_name}) => {
  return username || [first_name, last_name].filter(Boolean).join(' ')
}
