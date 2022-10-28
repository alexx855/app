import React, { FC, useCallback, useContext, useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import PoolTable, { TableRow } from './poolTable';

import { formatFixed, parseFixed } from '@ethersproject/bignumber';
import { WeiPerEther, Zero } from '@ethersproject/constants';

import AccountDataContext from 'contexts/AccountDataContext';
import { useWeb3Context } from 'contexts/Web3Context';
import PreviewerContext from 'contexts/PreviewerContext';
import ContractsContext from 'contexts/ContractsContext';

import formatMarkets from 'utils/formatMarkets';
import formatNumber from 'utils/formatNumber';
import getSubgraph from 'utils/getSubgraph';
import queryRate from 'utils/queryRates';
import getAPRsPerMaturity from 'utils/getAPRsPerMaturity';
import parseTimestamp from 'utils/parseTimestamp';

import { Market } from 'types/Market';
import { FixedMarketData } from 'types/FixedMarketData';

import numbers from 'config/numbers.json';
import { Skeleton, Typography } from '@mui/material';

const { usdAmount: usdAmountPreviewer } = numbers;

const defaultRows = [
  { symbol: 'DAI' },
  { symbol: 'USDC' },
  { symbol: 'WETH' },
  { symbol: 'WBTC' },
  { symbol: 'wstETH' },
];

const MarketTables: FC = () => {
  const { network } = useWeb3Context();
  const { accountData } = useContext(AccountDataContext);
  const previewerData = useContext(PreviewerContext);
  const { getInstance } = useContext(ContractsContext);

  const [floatingRows, setFloatingRows] = useState<TableRow[]>([...defaultRows]);
  const [fixedRows, setFixedRows] = useState<TableRow[]>([...defaultRows]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getMarkets = useCallback(async () => {
    if (!accountData) return;

    setMarkets(formatMarkets(accountData));
  }, [accountData]);

  const defineRows = useCallback(async () => {
    if (!accountData || !network || !markets) return;

    const tempFloatingRows: TableRow[] = [];
    const tempFixedRows: TableRow[] = [];

    await Promise.all(
      markets.map(async ({ symbol }) => {
        const {
          market: marketAddress,
          totalFloatingDepositAssets,
          totalFloatingBorrowAssets,
          usdPrice,
          decimals,
          maxFuturePools,
        } = accountData[symbol];

        const totalFloatingDeposited = formatNumber(
          formatFixed(totalFloatingDepositAssets.mul(usdPrice).div(WeiPerEther), decimals),
        );
        const totalFloatingBorrowed = formatNumber(
          formatFixed(totalFloatingBorrowAssets.mul(usdPrice).div(WeiPerEther), decimals),
        );

        const floatingDepositAPR = await getRates(network.name, 'deposit', maxFuturePools, marketAddress);
        const floatingBorrowAPR = await getRates(network.name, 'borrow', maxFuturePools, marketAddress);

        tempFloatingRows.push({
          symbol,
          totalDeposited: totalFloatingDeposited,
          totalBorrowed: totalFloatingBorrowed,
          depositAPR: floatingDepositAPR,
          borrowAPR: floatingBorrowAPR,
        });

        if (!previewerData.address || !previewerData.abi) return;

        const previewerContract = getInstance(previewerData.address, previewerData.abi, 'previewer');

        let totalDeposited = Zero;
        let totalBorrowed = Zero;

        // Set deposits and borrows total of fixed pools
        accountData[symbol].fixedPools.forEach((m) => {
          totalDeposited = totalDeposited.add(m.supplied);
          totalBorrowed = totalBorrowed.add(m.borrowed);
        });

        const previewFixedData: FixedMarketData[] = await previewerContract?.previewFixed(
          parseFixed(usdAmountPreviewer.toString(), 18),
        );

        const marketMaturities = previewFixedData.find(({ market }) => market === marketAddress) as FixedMarketData;

        const { deposits, borrows, assets: initialAssets } = marketMaturities;

        const { APRsPerMaturity, maturityMaxAPRDeposit, maturityMinAPRBorrow } = getAPRsPerMaturity(
          deposits,
          borrows,
          decimals,
          initialAssets,
        );

        const depositAPR = {
          timestamp: maturityMaxAPRDeposit ? parseTimestamp(maturityMaxAPRDeposit) : undefined,
          apr: APRsPerMaturity[maturityMaxAPRDeposit]?.deposit,
        };

        const borrowAPR = {
          timestamp: maturityMinAPRBorrow ? parseTimestamp(maturityMinAPRBorrow) : undefined,
          apr: APRsPerMaturity[maturityMinAPRBorrow]?.borrow,
        };

        tempFixedRows.push({
          symbol,
          totalDeposited: formatNumber(formatFixed(totalDeposited.mul(usdPrice).div(WeiPerEther), decimals)),
          totalBorrowed: formatNumber(formatFixed(totalBorrowed.mul(usdPrice).div(WeiPerEther), decimals)),
          depositAPR: depositAPR.apr,
          borrowAPR: borrowAPR.apr,
        });
      }),
    );

    setFloatingRows(tempFloatingRows);
    setFixedRows(tempFixedRows);
    setIsLoading(false);
  }, [accountData, getInstance, markets, network, previewerData.abi, previewerData.address]);

  const floatingHeaders = [
    { title: 'Asset' },
    { title: 'Total Deposited' },
    { title: 'Total Borrowed' },
    { title: 'Deposit APR' },
    { title: 'Borrow APR' },
  ];
  const fixedHeaders = [
    { title: 'Asset' },
    { title: 'Total Deposited' },
    { title: 'Total Borrowed' },
    { title: 'Deposit Best APR', width: 90 },
    { title: 'Borrow Best APR', width: 90 },
  ];

  async function getRates(
    networkName: string,
    type: 'borrow' | 'deposit',
    maxFuturePools: number,
    eMarketAddress: string,
  ) {
    const subgraphUrl = getSubgraph(networkName);

    const data = await queryRate(subgraphUrl, eMarketAddress, type, { maxFuturePools });

    const interestRate = data[0].apr;

    return interestRate;
  }

  useEffect(() => {
    void defineRows();
  }, [defineRows]);

  useEffect(() => {
    void getMarkets();
  }, [accountData, getMarkets]);

  return (
    <Grid container spacing={2} justifyContent="center" my={4}>
      <Grid item sx={{ maxWidth: '620px' }}>
        <Typography variant="h5" mb={1}>
          Variable Rate Pools
        </Typography>
        {isLoading ? (
          <Skeleton height={400} width={610} />
        ) : (
          <PoolTable headers={floatingHeaders} rows={floatingRows} />
        )}
      </Grid>
      <Grid item sx={{ maxWidth: '620px' }}>
        <Typography variant="h5" mb={1}>
          Fixed Rate Pools
        </Typography>

        {isLoading ? <Skeleton height={400} width={610} /> : <PoolTable headers={fixedHeaders} rows={fixedRows} />}
      </Grid>
    </Grid>
  );
};

export default MarketTables;
