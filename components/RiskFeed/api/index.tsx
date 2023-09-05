import { Address, Hex } from 'viem';

import { defaultChain } from 'utils/client';
import useAsyncLoad from 'hooks/useAsyncLoad';

export type SafeResponse = {
  count: number;
  next: number | null;
  previous: number | null;
  results: Result[];
};

type Result =
  | { type: 'LABEL' | 'DATE_LABEL' }
  | {
      type: 'TRANSACTION';
      transaction: Transaction;
    };

type TxID = `multisig_${Address}_${Hex}`;

export type Transaction = {
  id: TxID;
  timestamp: number;
  txStatus: 'SUCCESS' | 'AWAITING_EXECUTION';
  txInfo: TxInfo;
  executionInfo: ExecutionInfo;
};

type TxInfo = {
  type: string;
  humanDescription: null | string;
  to: Wallet;
  dataSize: string;
  value: string;
  methodName: null | 'multiSend' | 'execute' | 'schedule';
  actionCount: null | number;
  isCancellation: boolean;
};

type ExecutionInfo = {
  type: string;
  nonce: number;
  confirmationsRequired: number;
  confirmationsSubmitted: number;
};

export type SafeTransaction = {
  safeAddress: string;
  txId: TxID;
  executedAt: null | number;
  txStatus: 'SUCCESS' | 'AWAITING_EXECUTION';
  txInfo: TxInfo;
  txData: TxData;
  txHash: Hex;
  detailedExecutionInfo: DetailedExecutionInfo;
};

type DetailedExecutionInfo = {
  submittedAt: number;
  refundReceiver: Wallet;
  safeTxHash: Hex;
  executor: Wallet;
  signers: Wallet[];
  confirmationsRequired: number;
  confirmations: Confirmation[];
  trusted: boolean;
};

type Confirmation = {
  signer: Wallet;
  signature: Hex;
  submittedAt: number;
};

type Wallet = {
  value: Address;
  name: null | string;
  logoUri: null | string;
};

type TxData = {
  hexData: Hex;
  dataDecoded: DataDecoded | null;
  to: Wallet;
  value: string;
  operation: number;
  addressInfoIndex: Record<Address, Wallet>;
};

type DataDecoded = {
  method: string;
  parameters: Parameter[];
};

type Parameter = {
  name: string;
  type: string;
  value: string;
  valueDecoded?: ValueDecoded[];
};

type ValueDecoded = {
  operation: number;
  to: Address;
  value: string;
  data: string;
  dataDecoded: DataDecoded;
};

const base = `https://safe-client.safe.global/v1/chains/${defaultChain.id}`;

function safeUrl(addr: Address): string {
  return `${base}/safes/${addr}`;
}

async function queued(addr: Address): Promise<SafeResponse> {
  return await fetch(`${safeUrl(addr)}/transactions/queued`).then((res) => res.json());
}

async function history(addr: Address): Promise<SafeResponse> {
  return await fetch(`${safeUrl(addr)}/transactions/history`).then((res) => res.json());
}

async function transaction(id: TxID): Promise<SafeTransaction> {
  return await fetch(`${base}/transactions/${id}`).then((res) => res.json());
}

export function useQueued(addr: Address) {
  return useAsyncLoad(() => queued(addr));
}

export function useHistory(addr: Address) {
  return useAsyncLoad(() => history(addr));
}

export function useTransaction(id: TxID) {
  return useAsyncLoad(() => transaction(id));
}
