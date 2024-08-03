import BigNumber from "bignumber.js";
import { PsbtV2 } from "@caravan/psbt";
import { Network } from "@caravan/bitcoin";

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  script: Buffer;
  additionalData?: any; // For any additional data required for the input
}

export interface TransactionOutput {
  address: string;
  amountSats: BigNumber;
}

export interface TransactionAnalyzerOptions {
  psbt: PsbtV2 | string | Buffer;
  network: Network;
  dustThreshold?: number;
  targetFeeRate: FeeRateSatsPerVByte;
  additionalUtxos?: UTXO[];
  spendableOutputs: { index: number; amount: BigNumber }[];
  changeOutputs: { index: number; amount: BigNumber }[];
  requiredSigners: number;
  totalSigners: number;
}

export enum FeeBumpStrategy {
  RBF = "RBF",
  CPFP = "CPFP",
  NONE = "NONE",
}
export type UrgencyLevel = "low" | "medium" | "high";

export type AddressType = "P2SH" | "P2SH-P2WSH" | "P2WSH";

export type FeeRateSatsPerVByte = number;

export interface RbfTransactionOptions {
  psbt: PsbtV2 | string | Buffer;
  network: Network;
  targetFeeRate: FeeRateSatsPerVByte;
  feeOutputIndex?: number;
  dustThreshold?: string | number;
  additionalUtxos?: UTXO[];
  requiredSigners: number;
  totalSigners: number;
  changeOutputIndices: number[];
}

export interface FeeEstimate {
  lowFee: FeeRateSatsPerVByte;
  mediumFee: FeeRateSatsPerVByte;
  highFee: FeeRateSatsPerVByte;
}

export interface TransactionDetails {
  inputs: {
    txid: string;
    vout: number;
    amount: BigNumber;
  }[];
  outputs: {
    address: string;
    amount: BigNumber;
  }[];
  fee: BigNumber;
}

export interface RbfTransactionResult {
  psbt: string; // Base64 encoded PSBT
  details: TransactionDetails;
  feeRate: FeeRateSatsPerVByte;
}

export interface CancelTransactionResult extends RbfTransactionResult {
  destinationAddress: string;
}

export interface CPFPOptions {
  parentPsbt: PsbtV2 | string | Buffer;
  spendableOutputs: number[];
  destinationAddress: string;
  targetFeeRate: FeeRateSatsPerVByte;
  network: Network;
  maxAdditionalInputs?: number;
  maxChildTxSize?: number;
  dustThreshold?: number;
  additionalUtxos?: UTXO[];
  requiredSigners: number;
  totalSigners: number;
  addressType: string;
}

export interface MultisigDetails {
  requiredSigners: number;
  totalSigners: number;
  addressType: AddressType;
}

export interface WalletConfig {
  addressType: string;
  requiredSigners: number;
  totalSigners: number;
  addresses: string[];
  // Add any other relevant wallet configuration details
}
