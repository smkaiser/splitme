import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'
import { getConnectionString } from './tableClient'

const containerName = process.env.PHOTOS_CONTAINER || 'trip-photos'

let _container: ContainerClient | null = null
let _ensured = false

export async function getPhotosContainer(): Promise<ContainerClient> {
  if (_container && _ensured) return _container
  const cs = getConnectionString()
  const svc = BlobServiceClient.fromConnectionString(cs)
  const container = svc.getContainerClient(containerName)
  if (!_ensured) {
    try {
      await container.createIfNotExists()
      _ensured = true
    } catch (e) {
      // Surface the error to caller; do not cache failed container client
      throw e
    }
  }
  _container = container
  return container
}

export function tripPhotoBlobName(tripId: string) {
  return `${tripId}/photo`
}
