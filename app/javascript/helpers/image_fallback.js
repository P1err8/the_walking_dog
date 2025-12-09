export function withImageFallback(url, fallbackPath) {
  return new Promise((resolve) => {
    if (!url) return resolve(fallbackPath)

    const img = new Image()
    img.onload = () => resolve(url)
    img.onerror = () => resolve(fallbackPath)
    img.src = url
  })
}
