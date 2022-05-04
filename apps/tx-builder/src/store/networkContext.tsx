import { createContext, useContext, useEffect, useState } from 'react'
import SafeAppsSDK, { ChainInfo, SafeInfo } from '@gnosis.pm/safe-apps-sdk'
import Web3 from 'web3'
import InterfaceRepository, { InterfaceRepo } from '../lib/interfaceRepository'
import { CHAINS, rpcUrlGetterByNetwork } from '../utils'
import { useSafeAppsSDK } from '@gnosis.pm/safe-apps-react-sdk'

type NetworkContextProps = {
  sdk: SafeAppsSDK
  safe: SafeInfo
  chainInfo: ChainInfo | undefined
  web3: Web3 | undefined
  interfaceRepo: InterfaceRepo | undefined
  networkPrefix: string | undefined
  nativeCurrencySymbol: string | undefined
  getAddressFromDomain: (name: string) => Promise<string>
}

export const NetworkContext = createContext<NetworkContextProps | null>(null)

const NetworkProvider: React.FC = ({ children }) => {
  const { sdk, safe } = useSafeAppsSDK()
  const [web3, setWeb3] = useState<Web3 | undefined>()
  const [chainInfo, setChainInfo] = useState<ChainInfo>()
  const [interfaceRepo, setInterfaceRepo] = useState<InterfaceRepository | undefined>()

  useEffect(() => {
    if (!chainInfo) {
      return
    }

    const rpcUrlGetter = rpcUrlGetterByNetwork[chainInfo.chainId as CHAINS]
    if (!rpcUrlGetter) {
      throw Error(`RPC URL not defined for chain id ${chainInfo.chainId}`)
    }
    const rpcUrl = rpcUrlGetter(process.env.REACT_APP_RPC_TOKEN)

    const web3Instance = new Web3(rpcUrl)
    const interfaceRepo = new InterfaceRepository(chainInfo)

    setWeb3(web3Instance)
    setInterfaceRepo(interfaceRepo)
  }, [chainInfo])

  useEffect(() => {
    const getChainInfo = async () => {
      try {
        const chainInfo = await sdk.safe.getChainInfo()
        setChainInfo(chainInfo)
      } catch (error) {
        console.error('Unable to get chain info:', error)
      }
    }

    getChainInfo()
  }, [sdk.safe])

  const networkPrefix = chainInfo?.shortName

  const nativeCurrencySymbol = chainInfo?.nativeCurrency.symbol

  const getAddressFromDomain = (name: string): Promise<string> => {
    return web3?.eth.ens.getAddress(name) || new Promise(resolve => resolve(name))
  }

  return (
    <NetworkContext.Provider
      value={{
        sdk,
        safe,
        chainInfo,
        web3,
        interfaceRepo,
        networkPrefix,
        nativeCurrencySymbol,
        getAddressFromDomain,
      }}
    >
      {children}
    </NetworkContext.Provider>
  )
}

export const useNetwork = () => {
  const contextValue = useContext(NetworkContext)
  if (contextValue === null) {
    throw new Error('Component must be wrapped with <TransactionProvider>')
  }

  return contextValue
}

export default NetworkProvider
