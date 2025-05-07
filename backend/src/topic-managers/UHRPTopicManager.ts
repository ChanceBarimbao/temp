import { AdmittanceInstructions, TopicManager } from '@bsv/overlay'
import { Transaction, PushDrop, Utils } from '@bsv/sdk'

export default class UHRPTopicManager implements TopicManager {
  /**
   * Identify if the outputs are admissible depending on the particular protocol requirements
   * @param beef - The transaction data in BEEF format
   * @param previousCoins - The previous coins to consider
   * @returns A promise that resolves with the admittance instructions
   */
  async identifyAdmissibleOutputs(beef: number[], previousCoins: number[]): Promise<AdmittanceInstructions> {
    try {
      console.log('previous UTXOs', previousCoins.length)
      const outputs: number[] = []
      const parsedTransaction = Transaction.fromBEEF(beef)

      for (const [i, output] of parsedTransaction.outputs.entries()) {
        try {
          const result = PushDrop.decode(output.lockingScript)
          if (result.fields.length < 5) { // UHRP tokens have 5 fields
            throw new Error('Invalid UHRP token')
          }
          if (result.fields[1].length !== 32) {
            throw new Error('Invalid hash length')
          }
          const fileLocationString = Utils.toUTF8(result.fields[2])
          const fileLocationURL = new URL(fileLocationString)
          if (fileLocationURL.protocol !== 'https:') {
            throw new Error('Advertisement must be on HTTPS')
          }
          const expiryTime = new Utils.Reader(result.fields[3]).readVarIntNum()
          const fileSize = new Utils.Reader(result.fields[4]).readVarIntNum()
          if (expiryTime < 1 || fileSize < 1) {
            throw new Error('Invalid expiry time or file size')
          }
          outputs.push(i)
        } catch (error) {
          console.error('Error with output', i, error)
        }
      }
      if (outputs.length === 0) {
        throw new Error(
          'This transaction does not publish a valid CWI account descriptor!'
        )
      }
      return {
        coinsToRetain: previousCoins,
        outputsToAdmit: outputs
      }
    } catch (error) {
      return {
        coinsToRetain: [],
        outputsToAdmit: []
      }
    }
  }
  /**
   * Get the documentation associated with this topic manager
   * @returns A promise that resolves to a string containing the documentation
   */
  async getDocumentation(): Promise<string> {
    return 'UHRP tokens must be valid\n has must be the correct size' +
    'advertisement must be HTTPS\n Expiry and file size must be valid'
  }

  /**
   * Get metadata about the topic manager
   * @returns A promise that resolves to an object containing metadata
   * @throws An error indicating the method is not implemented
   */
  async getMetaData(): Promise<{
    name: string
    shortDescription: string
    iconURL?: string
    version?: string
    informationURL?: string
  }> {
    return {
      name: 'UHRP',
      shortDescription: 'Manages UHRP.'
    }
  }
}
