export default function setupCounter(el: HTMLButtonElement) {
  let count = 0
  const setCounter = (count: number) => {
    el.innerHTML = `count is ${count}`
  }
  el.addEventListener('click', () => {
    count += 1
    setCounter(count)
  })
  setCounter(count)
} 