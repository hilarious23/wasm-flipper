import type { NextPage } from 'next'
import { useState, useCallback } from 'react'
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { Abi, ContractPromise } from '@polkadot/api-contract'
import {
  web3Enable,
  isWeb3Injected,
  web3Accounts,
} from '@polkadot/extension-dapp'
import type { InjectedAccountWithMeta, InjectedExtension } from '@polkadot/extension-inject/types'

import Head from 'next/head'
import styles from '../styles/Home.module.css'
import abiData from './abi'

const WS_PROVIDER = 'ws://127.0.0.1:9944'
const gasLimit = 18750000000
const storageDepositLimit = null

const Home: NextPage = () => {
  const [address, setAddress] = useState('')
  const [addressSubmitted, setAddressSubmitted] = useState(false)
  const [value, setValue] = useState('')
  const [account, setAccount] = useState<string>('')
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([])
  const [extensions, setExtensions] = useState<InjectedExtension[]>([])

  // load Substrate wallet and set the signer
  const initSubstrateProvider = useCallback(async () => {
    if (!isWeb3Injected) {
      throw new Error('The user does not have any Substrate wallet installed')
    }

    const extensions = await web3Enable('Flipper UI')

    if (extensions.length > 0) {
      setExtensions(extensions)
    }

    // set the first wallet as the signer (we assume there is only one wallet)
    // wallet.substrate.setSigner(extensions[0].signer)

    const injectedAccounts = await web3Accounts()

    if (injectedAccounts.length > 0) {
      setAccounts(injectedAccounts)
    }
  }, [])

  const handleOnSelect = async (event: any) => {
    setAccount(event.target.value)
  }

  const query = async (contract: ContractPromise, address: string) => {
    // (We perform the send from an account, here using Alice's address)
    const { gasRequired, result, output } = await contract.query.get(
      address,
      {
        gasLimit,
        storageDepositLimit,
      }
    )

    // The actual result from RPC as `ContractExecResult`
    console.log(result.toHuman())

    // the gas consumed for contract execution
    console.log(gasRequired.toHuman())

    // check if the call was successful
    if (result.isOk) {
      // output the return value
      console.log('Success', output?.toHuman())

      if (output) {
        setValue(output?.toString())
      }
    } else {
      console.error('Error', result.asErr)
    }
  }

  const flip = async () => {
    const provider = new WsProvider(WS_PROVIDER)
		const api = new ApiPromise({ provider })

    await api.isReady

    api.setSigner(extensions[0].signer)

    console.log('API is ready')

    const abi = new Abi(abiData, api.registry.getChainProperties())

    const contract = new ContractPromise(api, abi, address)

    // Send the transaction, like elsewhere this is a normal extrinsic
    // with the same rules as applied in the API (As with the read example,
    // additional params, if required can follow)
    await contract.tx
      .flip({ storageDepositLimit, gasLimit })
      .signAndSend(account, async (res) => {
        if (res.status.isInBlock) {
          console.log('in a block')
        } else if (res.status.isFinalized) {
          console.log('finalized')
        }
      })

    await query(contract, account)
  }


  return (
    <div className={styles.container}>
      <Head>
        <title>Flipper Contract</title>
        <meta name='description' content='Flipper Contract' />
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className={styles.main}>
        {addressSubmitted ? <>
          <h3 className={styles.title}>
            Flipper Contract
          </h3>

          <button onClick={initSubstrateProvider}>Load Wallets</button>

          <select onChange={handleOnSelect}>
            <option value="">Select Address</option>
            {accounts.map(account => (
              <option key={account.address} value={account.address}>{account.meta.name} {account.address}</option>
            ))}
          </select>

          <button onClick={flip}>Flip</button>

          <h4>{value}</h4>
        </> :
        <>
          <h3 className={styles.title}>
            Provide Contract Address
          </h3>
          <div className={styles.address}>
            <input
              type='text'
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
            <button onClick={e => setAddressSubmitted(true)}>Set</button>
          </div>
        </>}
      </main>
    </div>
  )
}

export default Home
