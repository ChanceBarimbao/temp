import { getHashFromURL, getURLForFile } from "uhrp-url"
import { getWallet } from "./walletSingleton"
import { PushDrop, Utils, Transaction, TopicBroadcaster, StorageUtils } from '@bsv/sdk'
/**
 * Publishes a file hosting commitment.
 * @param {string} url - The URL of the file to be committed.
 * @param {number} hostingMinutes - Duration for committing to hosting the file at the given url.
 * @param {string} address - Address associated with the commitment. // ?
 * @param {string} serviceURL - The overlay service URL where the commitment is submitted.
 * @returns {Promise<string>} - The UHRP URL of the published commitment.
 */
export async function publishCommitment({
  url,
  hostingMinutes,
  address,
  serviceURL = 'https://overlay.babbage.systems'
}: {
  url: string
  hostingMinutes: number
  address: string
  serviceURL?: string
}): Promise<string> {
  try {
    // TODO: Fetch the file from the provided URL
    const file = await fetch(url)
    // TODO: Read the file as a Blob and convert it to Buffer
    const blob = await file.blob()
    const buffer = await Buffer.from(await blob.text())
    // TODO: Generate a UHRP URL from the file's buffer using the uhrp-url getURLForFile function
    const UHRPURL = getURLForFile(buffer)
    // TODO: Generate a hash from the URL using the uhrp-url getHashFromURL function
    const UHRHash = getHashFromURL(UHRPURL)
    // TODO: Calculate the expiryTime for the UHRP advertisement based on the given hosting time.
    const now = new Date()

    // Convert the input (minutes) to milliseconds
    const expiryTime = now.getTime() + (hostingMinutes * 60 * 1000)
    const wallet = await getWallet();
    // Create a PushDrop locking script with the following fields according to the UHRP token protocol:
    const fields = [
      Buffer.from('1UHRPYnMHPuQ5Tgb3AF8JXqwKkmZVy5hG', 'utf8'), // Example protocol address
      Buffer.from(address, 'utf8'),
      UHRHash, // 32-byte SHA-256 hash of the file
      Buffer.from('advertise', 'utf8'),
      Buffer.from(url, 'utf8'),
      Buffer.from('' + expiryTime, 'utf8'),
      Buffer.from('' + blob.size.toString(), 'utf8')
    ]

    const writer = new Utils.Writer()

    for (const field of fields) {
      writer.writeVarIntNum(field.length)
      writer.write(Array.from(field))
    }
    const fieldsArray = writer.toArray()

    const pushdrop = new PushDrop(wallet)

    const OutputScript = await pushdrop.lock(
      [fieldsArray],
      [0, 'publishcommitment'],
        '1',
       'anyone',
    )

    // TODO: Create a new action with the BabbageSDK and the above locking script
    const newToken = await wallet.createAction({
      outputs: [{
        lockingScript:  OutputScript.toHex(),
        satoshis: 100,
        outputDescription: 'Requesting to store file',
      }],
      options: {
        randomizeOutputs: false,
        acceptDelayedBroadcast: false
      },
      description: `Requesting to store file`
    })

    // TODO: Convert the transaction result to BEEF (temporary step until fully deprecated)
    const tx = Transaction.fromAtomicBEEF(newToken.tx!)
    const beef = tx.toBEEF()

    // TODO: Submit the UHRP advertisement token beef data to the overlay
    const network = (await wallet.getNetwork({})).network
    // Make sure to stipulate a topic of 'tm_uhrp' in the X-Topics header.
    const broadcaster = new TopicBroadcaster(['tm_uhrp'], {
      networkPreset: location.hostname === 'localhost' ? 'local' : network
    })
  
    const broadcasterResult = await broadcaster.broadcast(tx)
    if (broadcasterResult.status === 'error') {
      throw new Error('Transaction failed to broadcast')
    }
    // const uhrpURL = StorageUtils.getURLForHash(UHRHash)
    // TODO: Parse the results and return the UHRP file URL
    // const parsedResponse = await response.json()

    console.log(broadcasterResult.message)

    return UHRPURL

  } catch (error) {
    console.error('Error creating commitment:', error)
    throw error
  }
}