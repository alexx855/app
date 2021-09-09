import React, { useState, useEffect, ChangeEventHandler } from "react";
import { ethers } from "ethers";

import CurrentNetwork from "components/CurrentNetwork";
import Breadcrumb from "components/common/Breadcrumb";
import SupplyForm from "components/SupplyForm";

import useContract from "hooks/useContract";

import exafin from "contracts/exafin.json";
import exaFrontContractData from "contracts/exaFront.json";

import { Market } from "types/Market";
import { SupplyRate } from "types/SupplyRate";

import style from "./style.module.scss";

type Props = {
  address: string;
};

function Exafin({ address }: Props) {
  const [potentialRate, setPotentialRate] = useState<string | undefined>(
    undefined
  );
  const [poolSupply, setPoolSupply] = useState<string | undefined>(undefined);
  const [poolLend, setPoolLend] = useState<string | undefined>(undefined);

  const [exafinData, setExafinData] = useState<Market | undefined>(undefined);
  const [hasRate, setHasRate] = useState<boolean>(false);

  const { contractWithSigner } = useContract(address, exafin.abi);

  const exaFrontContract = useContract(
    exaFrontContractData?.address,
    exaFrontContractData?.abi
  );

  useEffect(() => {
    if (exaFrontContract.contractWithSigner) {
      getMarketByAddress(address);
    }
  }, [exaFrontContract.contractWithSigner]);

  useEffect(() => {
    if (contractWithSigner) {
      getNextMonth();
    }
  }, [contractWithSigner]);

  async function getNextMonth() {
    const now = Math.floor(Date.now() / 1000);
    const oneDay: number = 86400;
    const thirtyDays: number = 86400 * 30;

    const nextMonth = now + thirtyDays;

    const test = await contractWithSigner?.rateForSupply(
      ethers.utils.parseUnits("0.00000001"),
      nextMonth
    );

    console.log(ethers.utils.formatEther(test[0]));
    console.log(ethers.utils.formatEther(test[1][1]));
  }

  async function getMarketByAddress(contractAddress: string) {
    const [address, symbol, isListed, collateralFactor, name] =
      await exaFrontContract?.contractWithSigner?.getMarketByAddress(
        contractAddress
      );
    const formattedMarketData: Market = {
      address,
      symbol,
      isListed,
      collateralFactor,
      name,
    };

    setExafinData(formattedMarketData);
  }

  function handleResult(data: SupplyRate) {
    setHasRate(true);
    setPotentialRate(data.potentialRate);
    setPoolSupply(data.poolSupply);
    setPoolLend(data.poolLend);
  }

  return (
    <div>
      <CurrentNetwork />

      <section className={style.container}>
        <Breadcrumb
          steps={[
            {
              value: exafinData?.symbol,
              url: `/markets/${exafinData?.address}`,
            },
          ]}
        />
        {exafinData?.name && (
          <h1>
            {exafinData.name}{" "}
            {exafinData?.symbol && <>({exafinData?.symbol})</>}
          </h1>
        )}

        <section className={style.dataContainer}>
          <section className={style.left}>
            <SupplyForm
              contractWithSigner={contractWithSigner!}
              handleResult={handleResult}
              hasRate={hasRate}
            />
          </section>
          {hasRate && (
            <section className={style.right}>
              <p>
                Tu interes anual es de: <strong>{potentialRate}</strong>
              </p>
              <p>
                Despues de tu deposito la pool va a tener{" "}
                <strong>
                  {poolSupply} {exafinData?.symbol}
                </strong>
              </p>
              <p>
                Despues de tu deposito la pool va a haber prestado{" "}
                <strong>
                  {poolLend} {exafinData?.symbol}
                </strong>
              </p>
            </section>
          )}
        </section>
      </section>
    </div>
  );
}

export async function getServerSideProps({ query }: any) {
  const { address } = query;

  return {
    props: {
      address,
    },
  };
}

export default Exafin;
