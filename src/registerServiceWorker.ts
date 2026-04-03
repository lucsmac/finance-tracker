import { registerSW } from 'virtual:pwa-register'

const ONE_HOUR_IN_MS = 60 * 60 * 1000

registerSW({
  immediate: true,
  onOfflineReady() {
    console.info('AutoMoney esta pronto para carregar o app shell offline.')
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) {
      return
    }

    void registration.update()
    window.setInterval(() => {
      void registration.update()
    }, ONE_HOUR_IN_MS)
  },
})
