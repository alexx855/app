import { useContext, useEffect } from 'react';
import { ethers } from 'ethers';

import Button from 'components/common/Button';

import LangContext from 'contexts/LangContext';

import { LangKeys } from 'types/Lang';
import { Deposit } from 'types/Deposit';
import { Borrow } from 'types/Borrow';
import { Decimals } from 'types/Decimals';
import { Option } from 'react-dropdown';

import styles from './style.module.scss';

import keys from './translations.json';

import parseTimestamp from 'utils/parseTimestamp';
import { getSymbol } from 'utils/utils';
import formatNumber from 'utils/formatNumber';
import parseSymbol from 'utils/parseSymbol';

import decimals from 'config/decimals.json';

type Props = {
  type?: Option;
  amount: string;
  fee: string;
  maturityDate: string;
  showModal: (data: Deposit | Borrow, type: String) => void;
  market: string;
  data: Deposit | Borrow;
};

function Item({ type, amount, fee, maturityDate, showModal, market, data }: Props) {
  const lang: string = useContext(LangContext);
  const translations: { [key: string]: LangKeys } = keys;

  const oneHour = 3600;
  const oneDay = oneHour * 24;
  const maturityLife = oneDay * 7 * 12;
  const nowInSeconds = Date.now() / 1000;
  const startDate = parseInt(maturityDate) - maturityLife;
  const current = nowInSeconds - startDate;
  const progress = (current * 100) / maturityLife;
  const fixedRate = (parseFloat(fee) * 100) / parseFloat(amount);
  const symbol = getSymbol(market);

  useEffect(() => {
    getMaturityData();
  }, [maturityDate]);

  async function getMaturityData() {}

  return (
    <details className={styles.container}>
      <summary className={styles.summary}>
        <div className={styles.symbol}>
          <img
            src={`/img/assets/${symbol?.toLowerCase()}.png`}
            alt={symbol}
            className={styles.assetImage}
          />
          <span className={styles.primary}>{parseSymbol(symbol)}</span>
        </div>
        <span className={styles.value}>
          {formatNumber(
            ethers.utils.formatUnits(amount, decimals[symbol! as keyof Decimals]),
            symbol
          )}
        </span>
        <span className={styles.value}>{fixedRate.toFixed(2)}%</span>
        <span className={styles.value}>{parseTimestamp(maturityDate)}</span>

        <span className={styles.value}>
          <div className={styles.line}>
            <div
              className={styles.progress}
              style={{ width: `${progress > 100 ? 100 : progress}%` }}
            />
          </div>
        </span>

        {type && (
          <div className={styles.buttonContainer}>
            <Button
              text={type.value == 'borrow' ? translations[lang].repay : translations[lang].withdraw}
              className={type.value == 'borrow' ? 'quaternary' : 'tertiary'}
              onClick={() => {
                showModal({ ...data, symbol }, type.value == 'borrow' ? 'repay' : 'withdraw');
              }}
            />
          </div>
        )}
      </summary>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Operation</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            <td>01/01/2022</td>
            <td>withdraw</td>
            <td>$100</td>
          </tbody>
          <tbody>
            <td>01/01/2022</td>
            <td>withdraw</td>
            <td>$100</td>
          </tbody>
          <tbody>
            <td>01/01/2022</td>
            <td>withdraw</td>
            <td>$100</td>
          </tbody>
        </table>
      </div>
    </details>
  );
}

export default Item;
