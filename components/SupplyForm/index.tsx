import style from "./style.module.scss";
import Input from "components/common/Input";
import Button from "components/common/Button";

import { useState } from "react";
import { ethers } from "ethers";
import { SupplyRate } from "types/SupplyRate";

type Props = {
  contractWithSigner: ethers.Contract;
  handleResult: (data: SupplyRate) => void;
  hasRate: boolean;
};

function SupplyForm({ contractWithSigner, handleResult, hasRate }: Props) {
  const [qty, setQty] = useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = useState<number | undefined>(undefined);

  function handleDate(e: React.ChangeEvent<HTMLInputElement>) {
    setDueDate(Math.floor(Date.parse(e.target.value) / 1000));
  }

  async function calculateRate() {
    const rateForSupply = await contractWithSigner?.rateForSupply(
      ethers.utils.parseUnits(qty!),
      dueDate
    );

    const potentialRate = ethers.utils.formatEther(rateForSupply[0]);
    const poolSupply = ethers.utils.formatEther(rateForSupply[1][1]);
    const poolLend = ethers.utils.formatEther(rateForSupply[1][0]);

    handleResult({ potentialRate, poolSupply, poolLend });
  }

  async function deposit() {
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    const from = await provider.getSigner().getAddress();

    const depositTx = await contractWithSigner?.supply(
      from,
      ethers.utils.parseUnits(qty!),
      dueDate
    );

    console.log(depositTx);
  }

  return (
    <>
      <div className={style.fieldContainer}>
        <span>Cantidad a depositar</span>
        <div className={style.inputContainer}>
          <Input
            type="number"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQty(e.target.value)
            }
          />
        </div>
      </div>
      <div className={style.fieldContainer}>
        <span>Fecha de fin</span>
        <div className={style.inputContainer}>
          <Input type="date" onChange={handleDate} />
        </div>
      </div>
      <div className={style.fieldContainer}>
        {hasRate ? (
          <div className={style.buttonContainer}>
            <Button text="Depositar" onClick={deposit} />
          </div>
        ) : (
          <div className={style.buttonContainer}>
            <Button text="Calcular tasa" onClick={calculateRate} />
          </div>
        )}
      </div>
    </>
  );
}

export default SupplyForm;
