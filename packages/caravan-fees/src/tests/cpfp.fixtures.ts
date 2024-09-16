import { Network } from "@caravan/bitcoin";
import { UTXO, CPFPOptions } from "../types";

//https://mempool.space/tx/77f437ae7f796896f1d69e2c9329202d6ac4b4a03fbc0f18e06dfab87f4b0702
const parentTxHex =
  "020000000001019ef21963fbf5261d3b62f7f0467ab4b6d006b7d25a27d6744c95d9c11f577b210300000000ffffffff02713d0000000000001600147938bb5013f400246165f507ed015853430e28d2007c500200000000160014f2aecd6ab28d970ee8eea34665c181393b8754c60247304402201aaa53e645c14148171c3ea39841ee4ad7451d3a30f651e8a38ca20cec2cab9402206eab21ae37a5e0eaa0fe39d26821133e2c97297897de75b854865b5884a3523b012102b38786de2766d97e9d0341f9c2435b71242f0e41e887aebf8af5943afa7fa9b800000000";

const availableUTXOs: UTXO[] = [
  {
    // https://mempool.space/tx/9805c05eebf91913601ed9024330b8a3d4fcc4d2503abf4dce5067cb011673c5
    txid: "9805c05eebf91913601ed9024330b8a3d4fcc4d2503abf4dce5067cb011673c5",
    vout: 0,
    value: "529781",
    witnessUtxo: {
      script: Buffer.from(
        "001497a754f6dade2dba25d58058b1a283597f4236aa",
        "hex",
      ),
      value: 529781,
    },

    prevTxHex:
      "02000000000101427edede923448733dc125a975931bc62ecb5366bdf1289a0cbd445bf85d26620000000000fdffffff02751508000000000016001497a754f6dade2dba25d58058b1a283597f4236aaa1e3290000000000160014dc9abb9f0536f8ce517a248da673476a48a384f30247304402200d79b523aa388327ef663649bb2fe70fb405353de86cee0cbc30e74d131767140220437699b88488c56cab545c31a2fd0d139f6624fb1bed334f5138075dcee2d622012102e6ccf653b0c47a6b7a3d5c8b4bac43d51b2bbc7310d92cefbfbbdaf0588950d3421b0d00",
  },
  {
    txid: "77f437ae7f796896f1d69e2c9329202d6ac4b4a03fbc0f18e06dfab87f4b0702",
    vout: 1,
    value: "38829056",
    witnessUtxo: {
      script: Buffer.from(
        "0014f2aecd6ab28d970ee8eea34665c181393b8754c6",
        "hex",
      ),
      value: 38829056,
    },
    prevTxHex: parentTxHex,
  },
];

export const cpfpFixture: { test: CPFPOptions; expected: any }[] = [
  {
    test: {
      originalTx: parentTxHex,
      availableInputs: availableUTXOs,
      spendableOutputIndex: 1,
      changeAddress: "bc1q72hv664j3ktsa68w5drxtsvp8yacw4xxt7rvxm",
      network: Network.MAINNET,
      dustThreshold: "546",
      scriptType: "P2WPKH",
      targetFeeRate: 6.33,
      absoluteFee: "871",
      requiredSigners: 1,
      totalSigners: 1,
      strict: true,
    },
    expected: {
      parentTxid:
        "77f437ae7f796896f1d69e2c9329202d6ac4b4a03fbc0f18e06dfab87f4b0702",
      parentFee: "871",
      parentVsize: 140.25,
      childVsize: 109,
      childFee: "851",
      combinedFeeRate: 6.91,
      changeOutput: {
        address: "bc1q72hv664j3ktsa68w5drxtsvp8yacw4xxt7rvxm",
        value: "38828205",
      },
    },
  },
];