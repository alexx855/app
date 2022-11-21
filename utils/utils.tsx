import { UnderlyingNetwork } from 'types/Underlying';

import goerliDAI from '@exactly-protocol/protocol/deployments/goerli/DAI.json';
import goerliWETH from '@exactly-protocol/protocol/deployments/goerli/WETH.json';
import goerliWBTC from '@exactly-protocol/protocol/deployments/goerli/WBTC.json';
import goerliUSDC from '@exactly-protocol/protocol/deployments/goerli/USDC.json';
import goerliWSTETH from '@exactly-protocol/protocol/deployments/goerli/wstETH.json';

import mainnetDAI from '@exactly-protocol/protocol/deployments/mainnet/DAI.json';
import mainnetWETH from '@exactly-protocol/protocol/deployments/mainnet/WETH.json';
import mainnetWBTC from '@exactly-protocol/protocol/deployments/mainnet/WBTC.json';
import mainnetUSDC from '@exactly-protocol/protocol/deployments/mainnet/USDC.json';
import mainnetWSTETH from '@exactly-protocol/protocol/deployments/mainnet/wstETH.json';

import goerliFixedLenderDAI from '@exactly-protocol/protocol/deployments/goerli/MarketDAI.json';
import goerliFixedLenderWETH from '@exactly-protocol/protocol/deployments/goerli/MarketWETH.json';
import goerliFixedLenderWBTC from '@exactly-protocol/protocol/deployments/goerli/MarketWBTC.json';
import goerliFixedLenderUSDC from '@exactly-protocol/protocol/deployments/goerli/MarketUSDC.json';
import goerliFixedLenderWSTETH from '@exactly-protocol/protocol/deployments/goerli/MarketwstETH.json';

import mainnetFixedLenderDAI from '@exactly-protocol/protocol/deployments/mainnet/MarketDAI.json';
import mainnetFixedLenderWETH from '@exactly-protocol/protocol/deployments/mainnet/MarketWETH.json';
import mainnetFixedLenderWBTC from '@exactly-protocol/protocol/deployments/mainnet/MarketWBTC.json';
import mainnetFixedLenderUSDC from '@exactly-protocol/protocol/deployments/mainnet/MarketUSDC.json';
import mainnetFixedLenderWSTETH from '@exactly-protocol/protocol/deployments/mainnet/MarketwstETH.json';

export function transformClasses(style: any, classes: string) {
  if (!style) return 'style object is mandatory';

  const arr = classes?.split(' ') ?? [];
  return arr
    .map((val) => {
      return style[val] ?? '';
    })
    .join(' ');
}

export function formatWallet(walletAddress: string) {
  return `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`;
}

export function getUnderlyingData(network: string | undefined, symbol: string | undefined) {
  if (!symbol) return;

  const currentNetwork = network ?? process.env.NEXT_PUBLIC_NETWORK;

  const baseData: UnderlyingNetwork = {
    goerli: {
      DAI: {
        address: goerliDAI.address,
        abi: goerliDAI.abi,
      },
      WETH: {
        address: goerliWETH.address,
        abi: goerliWETH.abi,
      },
      WBTC: {
        address: goerliWBTC.address,
        abi: goerliWBTC.abi,
      },
      USDC: {
        address: goerliUSDC.address,
        abi: goerliUSDC.abi,
      },
      wstETH: {
        address: goerliWSTETH.address,
        abi: goerliWSTETH.abi,
      },
    },
    mainnet: {
      DAI: {
        address: mainnetDAI.address,
        abi: mainnetDAI.abi,
      },
      WETH: {
        address: mainnetWETH.address,
        abi: mainnetWETH.abi,
      },
      WBTC: {
        address: mainnetWBTC.address,
        abi: mainnetWBTC.abi,
      },
      USDC: {
        address: mainnetUSDC.address,
        abi: mainnetUSDC.abi,
      },
      wstETH: {
        address: mainnetWSTETH.address,
        abi: mainnetWSTETH.abi,
      },
    },
    homestead: {
      // HACK - remove this name and use chainId instead of network names
      DAI: {
        address: mainnetDAI.address,
        abi: mainnetDAI.abi,
      },
      WETH: {
        address: mainnetWETH.address,
        abi: mainnetWETH.abi,
      },
      WBTC: {
        address: mainnetWBTC.address,
        abi: mainnetWBTC.abi,
      },
      USDC: {
        address: mainnetUSDC.address,
        abi: mainnetUSDC.abi,
      },
      wstETH: {
        address: mainnetWSTETH.address,
        abi: mainnetWSTETH.abi,
      },
    },
  };

  return baseData[currentNetwork!.toLowerCase()][symbol];
}

export function getSymbol(address: string, network: string | undefined) {
  const currentNetwork = network ?? process.env.NEXT_PUBLIC_NETWORK;

  const dictionary: Record<string, Record<string, string>> = {
    goerli: {
      [goerliFixedLenderDAI.address.toLowerCase()]: 'DAI',
      [goerliFixedLenderWETH.address.toLowerCase()]: 'WETH',
      [goerliFixedLenderWBTC.address.toLowerCase()]: 'WBTC',
      [goerliFixedLenderUSDC.address.toLowerCase()]: 'USDC',
      [goerliFixedLenderWSTETH.address.toLowerCase()]: 'wstETH',
    },
    mainnet: {
      [mainnetFixedLenderDAI.address.toLowerCase()]: 'DAI',
      [mainnetFixedLenderWETH.address.toLowerCase()]: 'WETH',
      [mainnetFixedLenderWBTC.address.toLowerCase()]: 'WBTC',
      [mainnetFixedLenderUSDC.address.toLowerCase()]: 'USDC',
      [mainnetFixedLenderWSTETH.address.toLowerCase()]: 'wstETH',
    },
    homestead: {
      // HACK - remove this name and use chainId instead of network names
      [mainnetFixedLenderDAI.address.toLowerCase()]: 'DAI',
      [mainnetFixedLenderWETH.address.toLowerCase()]: 'WETH',
      [mainnetFixedLenderWBTC.address.toLowerCase()]: 'WBTC',
      [mainnetFixedLenderUSDC.address.toLowerCase()]: 'USDC',
      [mainnetFixedLenderWSTETH.address.toLowerCase()]: 'wstETH',
    },
  };

  return dictionary[currentNetwork!.toLowerCase()]
    ? dictionary[currentNetwork!.toLowerCase()][address.toLowerCase()]
    : 'DAI';
}

export const toPercentage = (value?: number) => {
  if (value != null) {
    return value.toLocaleString(undefined, {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return 'N/A';
};
