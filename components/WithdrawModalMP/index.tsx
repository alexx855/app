import { ChangeEvent, useContext, useEffect, useState } from 'react';
import { Contract, ethers } from 'ethers';

import Button from 'components/common/Button';
import ModalAsset from 'components/common/modal/ModalAsset';
import ModalInput from 'components/common/modal/ModalInput';
import ModalRow from 'components/common/modal/ModalRow';
import ModalTitle from 'components/common/modal/ModalTitle';
import ModalTxCost from 'components/common/modal/ModalTxCost';
import ModalMinimized from 'components/common/modal/ModalMinimized';
import ModalWrapper from 'components/common/modal/ModalWrapper';
import ModalGif from 'components/common/modal/ModalGif';
import Overlay from 'components/Overlay';
import ModalRowEditable from 'components/common/modal/ModalRowEditable';
import ModalError from 'components/common/modal/ModalError';
import ModalExpansionPanelWrapper from 'components/common/modal/ModalExpansionPanelWrapper';

import { Borrow } from 'types/Borrow';
import { Deposit } from 'types/Deposit';
import { LangKeys } from 'types/Lang';
import { Gas } from 'types/Gas';
import { Transaction } from 'types/Transaction';
import { Decimals } from 'types/Decimals';
import { Error } from 'types/Error';

import parseTimestamp from 'utils/parseTimestamp';
import { getContractData } from 'utils/contracts';
import formatNumber from 'utils/formatNumber';
import { getSymbol } from 'utils/utils';
import handleEth from 'utils/handleEth';

import styles from './style.module.scss';

import LangContext from 'contexts/LangContext';
import { useWeb3Context } from 'contexts/Web3Context';
import FixedLenderContext from 'contexts/FixedLenderContext';
import PreviewerContext from 'contexts/PreviewerContext';

import decimals from 'config/decimals.json';
import numbers from 'config/numbers.json';

import keys from './translations.json';

type Props = {
  data: Borrow | Deposit;
  closeModal: (props: any) => void;
};

function WithdrawModalMP({ data, closeModal }: Props) {
  const { symbol, maturity, assets, fee } = data;

  const { web3Provider, walletAddress, network } = useWeb3Context();

  const lang: string = useContext(LangContext);
  const translations: { [key: string]: LangKeys } = keys;

  const fixedLenderData = useContext(FixedLenderContext);
  const previewerData = useContext(PreviewerContext);

  const parsedFee = ethers.utils.formatUnits(fee, decimals[symbol! as keyof Decimals]);
  const parsedAmount = ethers.utils.formatUnits(assets, decimals[symbol! as keyof Decimals]);
  const finalAmount = (parseFloat(parsedAmount) + parseFloat(parsedFee)).toString();

  const [qty, setQty] = useState<string>('');
  const [gas, setGas] = useState<Gas | undefined>();
  const [tx, setTx] = useState<Transaction | undefined>(undefined);
  const [minimized, setMinimized] = useState<Boolean>(false);
  const [slippage, setSlippage] = useState<string>(parsedAmount);
  const [editSlippage, setEditSlippage] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isEarlyWithdraw, setIsEarlyWithdraw] = useState<boolean>(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [needsApproval, setNeedsApproval] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('0');

  const [fixedLenderWithSigner, setFixedLenderWithSigner] = useState<Contract | undefined>(
    undefined
  );

  const ETHrouter =
    web3Provider && symbol == 'WETH' && handleEth(network?.name, web3Provider?.getSigner());

  const previewerContract = getContractData(
    network?.name,
    previewerData.address!,
    previewerData.abi!
  );

  useEffect(() => {
    getFixedLenderContract();
  }, [fixedLenderData]);

  useEffect(() => {
    checkAllowance();
  }, [walletAddress, fixedLenderWithSigner, symbol, qty]);

  useEffect(() => {
    const earlyWithdraw = Date.now() / 1000 < parseInt(maturity);

    if (earlyWithdraw) {
      setIsEarlyWithdraw(earlyWithdraw);
    }

    if (!earlyWithdraw) {
      //if the maturity is closed the user should be able to withdraw everything.
      // so slippage = finalAmount

      setSlippage(finalAmount);
    }
  }, [maturity]);

  useEffect(() => {
    if (fixedLenderWithSigner && !gas) {
      estimateGas();
    }
  }, [fixedLenderWithSigner]);

  useEffect(() => {
    if (qty == '') return;
    previewWithdrawAtMaturity();
  }, [qty]);

  async function checkAllowance() {
    if (symbol != 'WETH' || !ETHrouter || !walletAddress || !fixedLenderWithSigner) return;

    const allowance = await ETHrouter.checkAllowance(walletAddress, fixedLenderWithSigner);

    if (
      (allowance && parseFloat(allowance) < parseFloat(qty)) ||
      (allowance && parseFloat(allowance) == 0 && !qty)
    ) {
      setNeedsApproval(true);
    }
  }

  function onMax() {
    setQty(finalAmount);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.valueAsNumber > parseFloat(parsedAmount)) {
      setError({
        status: true,
        message: translations[lang].insufficientBalance,
        component: 'input'
      });
    } else {
      setError(undefined);
    }

    setQty(e.target.value);
  }

  async function previewWithdrawAtMaturity() {
    const decimals = await fixedLenderWithSigner?.decimals();
    const market = fixedLenderWithSigner?.address;
    const parsedMaturity = parseInt(maturity);
    const parsedQtyValue = ethers.utils.parseUnits(qty, decimals);

    const earlyWithdrawAmount = await previewerContract?.previewWithdrawAtMaturity(
      market,
      parsedMaturity,
      parsedQtyValue
    );

    const formatWithdrawAmount = ethers.utils.formatUnits(earlyWithdrawAmount, decimals);
    const minimumWithdrawAmount = parseFloat(formatWithdrawAmount) * (1 - numbers.slippage);

    setWithdrawAmount(formatWithdrawAmount);
    setSlippage(formatNumber(minimumWithdrawAmount, symbol!, true));
  }

  async function withdraw() {
    setLoading(true);

    try {
      //we should change this 0 in case of earlyWithdraw with the amount - penaltyFee from the previewWithdraw
      const minAmount = isEarlyWithdraw ? 0 : finalAmount;
      let withdraw;
      let decimals;

      if (symbol == 'WETH') {
        if (!ETHrouter) return;

        decimals = 18;

        withdraw = await ETHrouter?.withdrawAtMaturityETH(maturity, qty, minAmount.toString());
      } else {
        decimals = await fixedLenderWithSigner?.decimals();

        withdraw = await fixedLenderWithSigner?.withdrawAtMaturity(
          maturity,
          ethers.utils.parseUnits(qty!, decimals),
          ethers.utils.parseUnits(`${minAmount}`, decimals),
          walletAddress,
          walletAddress
        );
      }

      setTx({ status: 'processing', hash: withdraw?.hash });

      const txReceipt = await withdraw.wait();

      setLoading(false);

      if (txReceipt.status == 1) {
        setTx({ status: 'success', hash: txReceipt?.transactionHash });
      } else {
        setTx({ status: 'error', hash: txReceipt?.transactionHash });
      }
    } catch (e: any) {
      console.log(e);
      setLoading(false);

      const isDenied = e?.message?.includes('User denied');
      const txError = e?.message?.includes(`"status":0`);

      const regex = new RegExp(/\"hash":"(.*?)\"/g); //regex to get all between ("hash":") and (")
      const preTxHash = e?.message?.match(regex); //get the hash from plain text by the regex
      const txErrorHash = preTxHash![0].substring(8, preTxHash![0].length - 1); //parse the string to get the txHash only

      if (isDenied) {
        setError({
          status: true,
          message: isDenied && translations[lang].deniedTransaction
        });
      } else if (txError) {
        setTx({ status: 'error', hash: txErrorHash });
      } else {
        setError({
          status: true,
          message: translations[lang].generalError
        });
      }
    }
  }

  async function estimateGas() {
    if (symbol == 'WETH') return;

    try {
      const gasPriceInGwei = await fixedLenderWithSigner?.provider.getGasPrice();
      const decimals = await fixedLenderWithSigner?.decimals();

      const estimatedGasCost = await fixedLenderWithSigner?.estimateGas.withdrawAtMaturity(
        maturity,
        ethers.utils.parseUnits(`${numbers.estimateGasAmount}`, decimals),
        ethers.utils.parseUnits('0', decimals),
        walletAddress,
        walletAddress
      );

      if (gasPriceInGwei && estimatedGasCost) {
        const gwei = await ethers.utils.formatUnits(gasPriceInGwei, 'gwei');
        const gasCost = await ethers.utils.formatUnits(estimatedGasCost, 'gwei');
        const eth = parseFloat(gwei) * parseFloat(gasCost);

        setGas({ eth: eth.toFixed(8), gwei: parseFloat(gwei).toFixed(1) });
      }
    } catch (e) {
      setError({
        status: true,
        component: 'gas'
      });
    }
  }

  async function approve() {
    if (symbol == 'WETH') {
      if (!web3Provider || !ETHrouter || !fixedLenderWithSigner) return;

      try {
        setLoading(true);

        const approve = await ETHrouter.approve(fixedLenderWithSigner);

        await approve.wait();

        setLoading(false);
        setNeedsApproval(false);
      } catch (e: any) {
        setLoading(false);

        const isDenied = e?.message?.includes('User denied');

        setError({
          status: true,
          message: isDenied
            ? translations[lang].deniedTransaction
            : translations[lang].notEnoughSlippage
        });
      }
    }
  }

  async function getFixedLenderContract() {
    const filteredFixedLender = fixedLenderData.find((contract) => {
      const contractSymbol = getSymbol(contract.address!, network!.name);

      return contractSymbol == symbol;
    });

    const fixedLender = await getContractData(
      network?.name,
      filteredFixedLender?.address!,
      filteredFixedLender?.abi!,
      web3Provider?.getSigner()
    );

    setFixedLenderWithSigner(fixedLender);
  }

  return (
    <>
      {!minimized && (
        <ModalWrapper closeModal={closeModal}>
          {!tx && (
            <>
              <ModalTitle
                title={
                  isEarlyWithdraw ? translations[lang].earlyWithdraw : translations[lang].withdraw
                }
              />
              <ModalAsset asset={symbol!} amount={finalAmount} />
              <ModalRow text={translations[lang].maturityPool} value={parseTimestamp(maturity)} />
              <ModalInput
                onMax={onMax}
                value={qty}
                onChange={handleInputChange}
                symbol={symbol!}
                error={error?.component == 'input'}
              />
              {error?.component !== 'gas' && symbol != 'WETH' && <ModalTxCost gas={gas} />}
              <ModalRow
                text={translations[lang].amountAtFinish}
                value={formatNumber(finalAmount, symbol!)}
              />
              <ModalExpansionPanelWrapper>
                <ModalRow
                  text={translations[lang].amountToReceive}
                  value={
                    isEarlyWithdraw
                      ? formatNumber(withdrawAmount, symbol!, true)
                      : formatNumber(finalAmount, symbol!, true)
                  }
                  line
                />

                {isEarlyWithdraw && (
                  <ModalRowEditable
                    text={translations[lang].amountSlippage}
                    value={slippage}
                    editable={editSlippage}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setSlippage(e.target.value);
                      error?.message == translations[lang].notEnoughSlippage && setError(undefined);
                    }}
                    onClick={() => {
                      if (slippage == '') setSlippage(parsedAmount);
                      setEditSlippage((prev) => !prev);
                    }}
                  />
                )}
              </ModalExpansionPanelWrapper>
              {error && error.component != 'gas' && <ModalError message={error.message} />}
              <div className={styles.buttonContainer}>
                <Button
                  text={needsApproval ? translations[lang].approve : translations[lang].withdraw}
                  className={
                    parseFloat(qty) <= 0 || !qty || error?.status ? 'secondaryDisabled' : 'tertiary'
                  }
                  disabled={parseFloat(qty) <= 0 || !qty || loading || error?.status}
                  onClick={needsApproval ? approve : withdraw}
                  loading={loading}
                  color="primary"
                />
              </div>
            </>
          )}
          {tx && <ModalGif tx={tx} tryAgain={withdraw} />}
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

export default WithdrawModalMP;
