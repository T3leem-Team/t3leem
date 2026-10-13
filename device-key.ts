
const DB_NAME = 't3leem-device-security'
const STORE_NAME = 'keys'
const KEY_ID = 'device-key-v1'

type StoredDeviceKey = {
  privateKey: CryptoKey
  publicKey: CryptoKey
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readKey(): Promise<StoredDeviceKey | null> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(KEY_ID)

    request.onsuccess = () => {
      db.close()
      resolve(request.result ?? null)
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

async function saveKey(key: StoredDeviceKey): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')

    transaction.objectStore(STORE_NAME).put(key, KEY_ID)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

export async function getOrCreateDeviceKey() {
  if (
    typeof window === 'undefined' ||
    !window.crypto?.subtle ||
    !window.indexedDB
  ) {
    throw new Error('المتصفح لا يدعم التخزين الآمن للمفتاح.')
  }

  let key = await readKey()

  if (!key) {
    const pair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      false,
      ['sign', 'verify'],
    )

    key = {
      privateKey: pair.privateKey,
      publicKey: pair.publicKey,
    }

    await saveKey(key)
  }

  const publicKeyBytes = await crypto.subtle.exportKey(
    'spki',
    key.publicKey,
  )

  return {
    publicKey: toBase64(new Uint8Array(publicKeyBytes)),

    async signChallenge(challenge: string): Promise<string> {
      const signature = await crypto.subtle.sign(
        {
          name: 'ECDSA',
          hash: 'SHA-256',
        },
        key!.privateKey,
        new TextEncoder().encode(challenge),
      )

      return toBase64(new Uint8Array(signature))
    },
  }
}
