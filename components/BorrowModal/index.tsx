import { ChangeEvent, useContext, useEffect, useState } from 'react';
import { Contract, ethers } from 'ethers';

import Button from 'components/common/Button';
import ModalAsset from 'components/common/modal/ModalAsset';
import ModalClose from 'components/common/modal/ModalClose';
import ModalInput from 'components/common/modal/ModalInput';
import ModalRow from 'components/common/modal/ModalRow';
import ModalTitle from 'components/common/modal/ModalTitle';
import ModalTxCost from 'components/common/modal/ModalTxCost';
import ModalMinimized from 'components/common/modal/ModalMinimized';
import ModalWrapper from 'components/common/modal/ModalWrapper';
import ModalGif from 'components/common/modal/ModalGif';
import Overlay from 'components/Overlay';
import ModalRowEditable from 'components/common/modal/ModalRowEditable';

import { Borrow } from 'types/Borrow';
import { Deposit } from 'types/Deposit';
import { LangKeys } from 'types/Lang';
import { UnderlyingData } from 'types/Underlying';
import { Gas } from 'types/Gas';
import { Transaction } from 'types/Transaction';

import { getContractData } from 'utils/contracts';
import { getUnderlyingData } from 'utils/utils';
import parseTimestamp from 'utils/parseTimestamp';

import styles from './style.module.scss';

import LangContext from 'contexts/LangContext';
import { useWeb3Context } from 'contexts/Web3Context';
import FixedLenderContext from 'contexts/FixedLenderContext';
import { AddressContext } from 'contexts/AddressContext';
import InterestRateModelContext from 'contexts/InterestRateModelContext';

import keys from './translations.json';

type Props = {
  data: Borrow | Deposit;
  closeModal: (props: any) => void;
};

function BorrowModal({ data, closeModal }: Props) {
  const { maturity, symbol } = data;

  const { web3Provider, walletAddress } = useWeb3Context();

  const { date } = useContext(AddressContext);

  const lang: string = useContext(LangContext);
  const translations: { [key: string]: LangKeys } = keys;

  const fixedLenderData = useContext(FixedLenderContext);
  const interestRateModelData = useContext(InterestRateModelContext);

  const [qty, setQty] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState<string | undefined>(undefined);
  const [gas, setGas] = useState<Gas | undefined>(undefined);
  const [tx, setTx] = useState<Transaction | undefined>(undefined);
  const [minimized, setMinimized] = useState<Boolean>(false);
  const [rate, setRate] = useState<string | undefined>('0');
  const [slippage, setSlippage] = useState<string>('0.5');
  const [editSlippage, setEditSlippage] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [fixedLenderWithSigner, setFixedLenderWithSigner] = useState<Contract | undefined>(
    undefined
  );

  let underlyingData: UnderlyingData | undefined = undefined;

  if (symbol) {
    underlyingData = getUnderlyingData(process.env.NEXT_PUBLIC_NETWORK!, symbol.toLowerCase());
  }

  const underlyingContract = getContractData(underlyingData!.address, underlyingData!.abi);

  const interestRateModelContract = getContractData(
    interestRateModelData.address!,
    interestRateModelData.abi!
  );

  useEffect(() => {
    if (fixedLenderData && !fixedLenderWithSigner) {
      getFixedLenderContract();
      getWalletBalance();
    }
  }, []);

  useEffect(() => {
    if (fixedLenderWithSigner && !gas) {
      estimateGas();
    }
  }, [fixedLenderWithSigner]);

  useEffect(() => {
    if (qty) {
      calculateRate();
    }
  }, [qty, date, maturity]);

  async function getWalletBalance() {
    const walletBalance = await underlyingContract?.balanceOf(walletAddress);

    const formattedBalance = walletBalance && ethers.utils.formatEther(walletBalance);

    if (formattedBalance) {
      setWalletBalance(formattedBalance);
    }
  }

  async function onMax() {
    walletBalance && setQty(walletBalance);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    setQty(e.target.value);
  }

  async function calculateRate() {
    if (qty <= '0') return;

    const smartPoolSupplied = await fixedLenderWithSigner?.smartPoolBalance();

    const maturityPoolStatus = await fixedLenderWithSigner?.maturityPools(
      parseInt(date?.value ?? maturity)
    );

    const currentTimestamp = Math.floor(Date.now() / 1000);

    //Borrow
    try {
      const borrowRate = await interestRateModelContract?.getRateToBorrow(
        parseInt(date?.value ?? maturity),
        currentTimestamp,
        ethers.utils.parseUnits(qty!),
        maturityPoolStatus.borrowed,
        maturityPoolStatus.supplied,
        smartPoolSupplied
      );

      const formattedBorrowRate = borrowRate && ethers.utils.formatEther(borrowRate);

      setRate(formattedBorrowRate);
    } catch (error: any) {
      console.log(error);
    }
  }

  async function borrow() {
    setLoading(true);
    try {
      const maxAmount = parseFloat(qty!) * (1 + parseFloat(slippage) / 100);

      const borrow = await fixedLenderWithSigner?.borrowAtMaturity(
        parseInt(date?.value ?? maturity),
        ethers.utils.parseUnits(qty!),
        ethers.utils.parseUnits(`${maxAmount}`),
        walletAddress,
        walletAddress
      );

      setTx({ status: 'processing', hash: borrow?.hash });

      const status = await borrow.wait();
      setLoading(false);

      setTx({ status: 'success', hash: status?.transactionHash });
    } catch (e) {
      setLoading(false);
      console.log(e);
    }
  }

  async function estimateGas() {
    const gasPriceInGwei = await fixedLenderWithSigner?.provider.getGasPrice();

    const estimatedGasCost = await fixedLenderWithSigner?.estimateGas.borrowAtMaturity(
      parseInt(date?.value ?? maturity),
      ethers.utils.parseUnits('1'),
      ethers.utils.parseUnits('2'),
      walletAddress,
      walletAddress
    );

    if (gasPriceInGwei && estimatedGasCost) {
      const gwei = await ethers.utils.formatUnits(gasPriceInGwei, 'gwei');
      const gasCost = await ethers.utils.formatUnits(estimatedGasCost, 'gwei');
      const eth = parseFloat(gwei) * parseFloat(gasCost);

      setGas({ eth: eth.toFixed(8), gwei: parseFloat(gwei).toFixed(1) });
    }
  }

  async function getFixedLenderContract() {
    const filteredFixedLender = fixedLenderData.find((contract) => {
      const args: Array<string> | undefined = contract?.args;
      const contractSymbol: string | undefined = args && args[1];

      return contractSymbol == symbol;
    });

    const fixedLender = await getContractData(
      filteredFixedLender?.address!,
      filteredFixedLender?.abi!,
      web3Provider?.getSigner()
    );

    setFixedLenderWithSigner(fixedLender);
  }

  return (
    <>
      {!minimized && (
        <ModalWrapper>
          {!tx && (
            <>
              <ModalTitle title={translations[lang].borrow} />
              <ModalAsset asset={symbol!} amount={walletBalance} />
              <ModalClose closeModal={closeModal} />
              <ModalRow
                text={translations[lang].maturityPool}
                value={date?.label ?? parseTimestamp(maturity)}
              />
              <ModalInput onMax={onMax} value={qty} onChange={handleInputChange} />
              {gas && <ModalTxCost gas={gas} />}
              <ModalRow text={translations[lang].interestRate} value={rate} line />
              <ModalRowEditable
                text={translations[lang].maximumBorrowRate}
                value={slippage}
                editable={editSlippage}
                symbol="%"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setSlippage(e.target.value);
                }}
                onClick={() => {
                  if (slippage == '') setSlippage('0.5');
                  setEditSlippage((prev) => !prev);
                }}
                line
              />
              <ModalRow text={translations[lang].maturityDebt} value={'X %'} line />
              <ModalRow text={translations[lang].healthFactor} values={['1,1', '1,8']} />
              <div className={styles.buttonContainer}>
                <Button
                  text={translations[lang].borrow}
                  className={qty <= '0' || !qty ? 'disabled' : 'secondary'}
                  onClick={borrow}
                  disabled={qty <= '0' || !qty || loading}
                  loading={loading}
                />
              </div>
            </>
          )}
          {tx && <ModalGif tx={tx} />}
        </ModalWrapper>
      )}

      {tx && minimized && (
        <ModalMinimized
          tx={tx}
          handleMinimize={() => {
            setMinimized((prev) => !prev);
          }}
        />
      )}

      {!minimized && (
        <Overlay
          closeModal={
            !tx || tx.status == 'success'
              ? closeModal
              : () => {
                  setMinimized((prev) => !prev);
                }
          }
        />
      )}
    </>
  );
}

export default BorrowModal;
