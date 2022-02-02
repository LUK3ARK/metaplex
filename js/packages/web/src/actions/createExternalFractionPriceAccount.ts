import {
  Keypair,
  Connection,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

import {
  utils,
  StringPublicKey,
  toPublicKey,
  WalletSigner,
} from '@oyster/common';
import {
  updateExternalPriceAccount,
  ExternalPriceAccount,
  MAX_EXTERNAL_ACCOUNT_SIZE,
} from '@oyster/common/dist/lib/actions/vault';

import BN from 'bn.js';

// This command creates the external pricing oracle
export async function createExternalFractionPriceAccount(
  connection: Connection,
  wallet: WalletSigner,
  totalSupply: BN,
  buyoutPrice: BN,
  priceMint: StringPublicKey,
): Promise<{
  priceMint: StringPublicKey;
  externalPriceAccount: StringPublicKey;
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const PROGRAM_IDS = utils.programIds();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const epaRentExempt = await connection.getMinimumBalanceForRentExemption(
    MAX_EXTERNAL_ACCOUNT_SIZE,
  );

  const externalPriceAccount = Keypair.generate();
  const key = externalPriceAccount.publicKey.toBase58();

  const epaStruct = new ExternalPriceAccount({
    pricePerShare: buyoutPrice.div(totalSupply),
    priceMint: priceMint,
    allowedToCombine: true,
  });

  const uninitializedEPA = SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: externalPriceAccount.publicKey,
    lamports: epaRentExempt,
    space: MAX_EXTERNAL_ACCOUNT_SIZE,
    programId: toPublicKey(PROGRAM_IDS.vault),
  });
  instructions.push(uninitializedEPA);
  signers.push(externalPriceAccount);

  await updateExternalPriceAccount(key, epaStruct, instructions);

  return {
    externalPriceAccount: key,
    priceMint: priceMint,
    instructions,
    signers,
  };
}
