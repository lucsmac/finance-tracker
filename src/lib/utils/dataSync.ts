export type DataSyncResource =
  | 'config'
  | 'transactions'
  | 'estimates'
  | 'goals'
  | 'daily_expenses'
  | 'daily_plans'
  | 'investments'

const getDataSyncEventName = (resource: DataSyncResource) => `automoney:data-sync:${resource}`

export const emitDataSync = (resource: DataSyncResource) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(getDataSyncEventName(resource)))
}

export const subscribeDataSync = (resource: DataSyncResource, listener: () => void) => {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const eventName = getDataSyncEventName(resource)
  const handler = () => listener()
  window.addEventListener(eventName, handler)

  return () => {
    window.removeEventListener(eventName, handler)
  }
}
